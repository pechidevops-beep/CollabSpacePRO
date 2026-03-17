import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { logActivity } from "./activity.js";
import { notifyWorkspaceMembers, sendNotification } from "./notifications.js";

const router = Router();

// ─── GET /api/pull-requests?repoId= — list PRs ─────────────────────
router.get("/", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const repoId = req.query.repoId;
    const status = req.query.status || "open";
    if (!repoId) return res.status(400).json({ message: "repoId is required" });

    const { data, error } = await sb
        .from("pull_requests")
        .select("*")
        .eq("repo_id", repoId)
        .eq("status", status)
        .order("created_at", { ascending: false });

    if (error) return res.status(400).json({ message: error.message });
    res.json(data ?? []);
}));

// ─── GET /api/pull-requests/:id — PR detail ────────────────────────
router.get("/:id", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const prId = req.params.id;

    const { data: pr, error } = await sb
        .from("pull_requests")
        .select("*")
        .eq("id", prId)
        .single();

    if (error) return res.status(400).json({ message: error.message });

    // Get comments
    const { data: comments } = await sb
        .from("pr_comments")
        .select("*")
        .eq("pr_id", prId)
        .order("created_at", { ascending: true });

    // Get source & target branch commits for diff
    const { data: sourceCommits } = await sb
        .from("commits")
        .select("id,message,hash,author_email,created_at")
        .eq("repo_id", pr.repo_id)
        .eq("branch", pr.source_branch)
        .order("created_at", { ascending: false })
        .limit(20);

    const { data: targetCommits } = await sb
        .from("commits")
        .select("id,message,hash,created_at")
        .eq("repo_id", pr.repo_id)
        .eq("branch", pr.target_branch)
        .order("created_at", { ascending: false })
        .limit(1);

    // Get files from latest source commit and latest target commit for diff
    let sourceFiles = [];
    let targetFiles = [];

    if (sourceCommits?.[0]) {
        const { data } = await sb
            .from("commit_files")
            .select("path,content,hash")
            .eq("commit_id", sourceCommits[0].id);
        sourceFiles = data ?? [];
    }

    if (targetCommits?.[0]) {
        const { data } = await sb
            .from("commit_files")
            .select("path,content,hash")
            .eq("commit_id", targetCommits[0].id);
        targetFiles = data ?? [];
    }

    res.json({
        pr,
        comments: comments ?? [],
        sourceCommits: sourceCommits ?? [],
        sourceFiles,
        targetFiles,
    });
}));

// ─── POST /api/pull-requests — create PR ────────────────────────────
router.post("/", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();

    const body = z.object({
        repoId: z.string().uuid(),
        title: z.string().min(1).max(200),
        description: z.string().default(""),
        sourceBranch: z.string().min(1),
        targetBranch: z.string().default("main"),
    }).parse(req.body);

    const { data, error } = await sb
        .from("pull_requests")
        .insert({
            repo_id: body.repoId,
            title: body.title,
            description: body.description,
            source_branch: body.sourceBranch,
            target_branch: body.targetBranch,
            author_id: req.user.id,
            author_email: req.user.email || "",
        })
        .select("*")
        .single();

    if (error) return res.status(400).json({ message: error.message });

    // Log activity
    const { data: repo } = await sb.from("repositories").select("workspace_id,name").eq("id", body.repoId).single();
    if (repo) {
        await logActivity(sb, {
            workspaceId: repo.workspace_id,
            userId: req.user.id,
            userEmail: req.user.email,
            action: "pr_created",
            targetType: "pull_request",
            targetId: data.id,
            targetName: `${body.title} (${body.sourceBranch} → ${body.targetBranch})`,
        });
    }
    // Notify workspace members
    if (repo) {
        await notifyWorkspaceMembers(sb, {
            workspaceId: repo.workspace_id,
            excludeUserId: req.user.id,
            type: "pr_created",
            title: `New PR: ${body.title}`,
            body: `${req.user.email?.split("@")[0]} opened a pull request on ${repo.name}`,
            link: `/pull-requests`,
            actorId: req.user.id,
            actorEmail: req.user.email,
        });
    }

    res.status(201).json(data);
}));

// ─── POST /api/pull-requests/:id/merge — merge PR ──────────────────
router.post("/:id/merge", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const prId = req.params.id;

    // Get PR
    const { data: pr, error: prErr } = await sb
        .from("pull_requests")
        .select("*")
        .eq("id", prId)
        .single();

    if (prErr) return res.status(400).json({ message: prErr.message });
    if (pr.status !== "open") return res.status(400).json({ message: "PR is not open" });

    // Get latest source branch commit files
    const { data: srcCommits } = await sb
        .from("commits")
        .select("id")
        .eq("repo_id", pr.repo_id)
        .eq("branch", pr.source_branch)
        .order("created_at", { ascending: false })
        .limit(1);

    if (!srcCommits?.[0]) {
        return res.status(400).json({ message: "No commits on source branch" });
    }

    const { data: srcFiles } = await sb
        .from("commit_files")
        .select("path,content,hash")
        .eq("commit_id", srcCommits[0].id);

    if (!srcFiles?.length) {
        return res.status(400).json({ message: "No files in source branch" });
    }

    // Create merge commit on target branch
    const crypto = await import("node:crypto");
    const allContent = srcFiles
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((f) => `${f.path}:${f.content}`)
        .join("\n");
    const mergeHash = crypto.createHash("sha256")
        .update(allContent + "|merge|" + Date.now(), "utf8")
        .digest("hex");

    const { data: mergeCommit, error: mcErr } = await sb
        .from("commits")
        .insert({
            repo_id: pr.repo_id,
            message: `Merge PR #${pr.id.slice(0, 8)}: ${pr.title}`,
            author_id: req.user.id,
            author_email: req.user.email || "",
            hash: mergeHash,
            branch: pr.target_branch,
        })
        .select("id")
        .single();

    if (mcErr) return res.status(400).json({ message: mcErr.message });

    // Copy source files to merge commit
    const mergeFiles = srcFiles.map((f) => ({
        commit_id: mergeCommit.id,
        path: f.path,
        content: f.content,
        hash: f.hash,
    }));

    await sb.from("commit_files").insert(mergeFiles);

    // Update PR status to merged
    await sb
        .from("pull_requests")
        .update({ status: "merged", merged_at: new Date().toISOString() })
        .eq("id", prId);

    // Update repo_files with merged content
    for (const f of srcFiles) {
        await sb.from("repo_files").upsert({
            repo_id: pr.repo_id,
            path: f.path,
            content: f.content,
            language: null,
        }, { onConflict: "repo_id,path" });
    }

    res.json({ merged: true, commitId: mergeCommit.id });

    // Notify PR author about merge
    if (pr.author_id !== req.user.id) {
        await sendNotification(sb, {
            userId: pr.author_id,
            type: "pr_merged",
            title: `PR merged: ${pr.title}`,
            body: `${req.user.email?.split("@")[0]} merged your pull request`,
            link: `/pull-requests`,
            actorId: req.user.id,
            actorEmail: req.user.email,
        });
    }
}));

// ─── POST /api/pull-requests/:id/comments — add comment ────────────
router.post("/:id/comments", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const prId = req.params.id;

    const body = z.object({
        body: z.string().min(1),
        filePath: z.string().optional(),
        lineNumber: z.number().optional(),
    }).parse(req.body);

    const { data, error } = await sb
        .from("pr_comments")
        .insert({
            pr_id: prId,
            user_id: req.user.id,
            user_email: req.user.email || "",
            body: body.body,
            file_path: body.filePath ?? null,
            line_number: body.lineNumber ?? null,
        })
        .select("*")
        .single();

    if (error) return res.status(400).json({ message: error.message });

    // Notify PR author about new comment
    const { data: pr } = await sb.from("pull_requests").select("author_id,title").eq("id", prId).single();
    if (pr && pr.author_id !== req.user.id) {
        await sendNotification(sb, {
            userId: pr.author_id,
            type: "pr_comment",
            title: `New comment on: ${pr.title}`,
            body: `${req.user.email?.split("@")[0]}: ${body.body.slice(0, 80)}`,
            link: `/pull-requests`,
            actorId: req.user.id,
            actorEmail: req.user.email,
        });
    }

    res.status(201).json(data);
}));

// ─── PATCH /api/pull-requests/:id — close PR ───────────────────────
router.patch("/:id", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const prId = req.params.id;
    const { status } = req.body;

    if (!["open", "closed"].includes(status)) {
        return res.status(400).json({ message: "Status must be 'open' or 'closed'" });
    }

    const { data, error } = await sb
        .from("pull_requests")
        .update({
            status,
            closed_at: status === "closed" ? new Date().toISOString() : null,
        })
        .eq("id", prId)
        .select("*")
        .single();

    if (error) return res.status(400).json({ message: error.message });
    res.json(data);
}));

export default router;

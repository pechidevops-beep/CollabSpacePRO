import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { logActivity } from "./activity.js";
import crypto from "node:crypto";

const router = Router();

// ─── Helper: compute SHA-256 hash ───────────────────────────────────
function sha256(str) {
    return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

// ─── GET /api/commits?repoId=&branch= — list commit history ─────────────────
router.get("/", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const repoId = req.query.repoId;
    const branch = req.query.branch;

    if (!repoId) return res.status(400).json({ message: "repoId is required" });

    let q = sb.from("commits")
        .select("id,repo_id,message,author_id,author_email,parent_id,hash,created_at,branch")
        .eq("repo_id", repoId);

    if (branch) {
        q = q.eq("branch", branch);
    }

    const { data, error } = await q
        .order("created_at", { ascending: false })
        .limit(100);

    if (error) return res.status(400).json({ message: error.message });
    res.json(data ?? []);
}));

// ─── GET /api/commits/latest?repoId=&branch= — get latest commit files ─────
router.get("/latest", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const repoId = req.query.repoId;
    const branch = req.query.branch || "main";

    if (!repoId) return res.status(400).json({ message: "repoId is required" });

    // Get latest commit
    const { data: commits, error: cErr } = await sb
        .from("commits")
        .select("id,message,hash,created_at")
        .eq("repo_id", repoId)
        .eq("branch", branch)
        .order("created_at", { ascending: false })
        .limit(1);

    if (cErr) return res.status(400).json({ message: cErr.message });
    if (!commits || commits.length === 0) {
        return res.json({ commit: null, files: [] });
    }

    const commit = commits[0];

    // Get files for this commit
    const { data: files, error: fErr } = await sb
        .from("commit_files")
        .select("path,content,hash")
        .eq("commit_id", commit.id)
        .order("path", { ascending: true });

    if (fErr) return res.status(400).json({ message: fErr.message });

    res.json({ commit, files: files ?? [] });
}));

// ─── GET /api/commits/:id — get specific commit with files ──────────
router.get("/:id", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const commitId = req.params.id;

    const { data: commit, error: cErr } = await sb
        .from("commits")
        .select("id,repo_id,message,author_id,author_email,parent_id,hash,created_at")
        .eq("id", commitId)
        .single();

    if (cErr) return res.status(400).json({ message: cErr.message });

    const { data: files, error: fErr } = await sb
        .from("commit_files")
        .select("path,content,hash")
        .eq("commit_id", commitId)
        .order("path", { ascending: true });

    if (fErr) return res.status(400).json({ message: fErr.message });

    res.json({ commit, files: files ?? [] });
}));

// ─── POST /api/commits/push — push files (create commit + snapshot) ─
router.post("/push", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();

    const body = z.object({
        repoId: z.string().uuid(),
        message: z.string().min(1).max(500),
        branch: z.string().default("main"),
        files: z.array(z.object({
            path: z.string().min(1),
            content: z.string(),
        })).min(1),
    }).parse(req.body);

    const userId = req.user.id;
    const userEmail = req.user.email || "";

    // Compute commit hash from all file contents
    const allContent = body.files
        .sort((a, b) => a.path.localeCompare(b.path))
        .map((f) => `${f.path}:${f.content}`)
        .join("\n");
    const commitHash = sha256(allContent + "|" + body.message + "|" + Date.now());

    // Get parent (latest commit)
    const { data: prev } = await sb
        .from("commits")
        .select("id")
        .eq("repo_id", body.repoId)
        .order("created_at", { ascending: false })
        .limit(1);

    const parentId = prev?.[0]?.id ?? null;

    // Create commit record
    const { data: commit, error: cErr } = await sb
        .from("commits")
        .insert({
            repo_id: body.repoId,
            message: body.message,
            author_id: userId,
            author_email: userEmail,
            parent_id: parentId,
            hash: commitHash,
            branch: body.branch,
        })
        .select("id,repo_id,message,author_id,author_email,parent_id,hash,created_at")
        .single();

    if (cErr) return res.status(400).json({ message: cErr.message });

    // Create file snapshots
    const fileRecords = body.files.map((f) => ({
        commit_id: commit.id,
        path: f.path,
        content: f.content,
        hash: sha256(f.content),
    }));

    const { error: fErr } = await sb
        .from("commit_files")
        .insert(fileRecords);

    if (fErr) return res.status(400).json({ message: fErr.message });

    // Also update repo_files (working tree) to match pushed files
    for (const f of body.files) {
        await sb
            .from("repo_files")
            .upsert({
                repo_id: body.repoId,
                path: f.path,
                content: f.content,
                language: null,
            }, { onConflict: "repo_id,path" });
    }

    // Log activity
    const { data: repo } = await sb.from("repositories").select("workspace_id,name").eq("id", body.repoId).single();
    if (repo) {
        await logActivity(sb, {
            workspaceId: repo.workspace_id,
            userId,
            userEmail,
            action: "commit_pushed",
            targetType: "repository",
            targetId: body.repoId,
            targetName: repo.name,
            metadata: { message: body.message, filesCount: body.files.length },
        });
    }

    res.status(201).json({
        commit,
        filesCount: body.files.length,
    });
}));

export default router;

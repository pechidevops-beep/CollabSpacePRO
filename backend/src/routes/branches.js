import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// ─── GET /api/branches?repoId= — list branches ─────────────────────
router.get("/", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const repoId = req.query.repoId;
    if (!repoId) return res.status(400).json({ message: "repoId is required" });

    const { data, error } = await sb
        .from("branches")
        .select("id,repo_id,name,head_commit_id,created_by,created_at")
        .eq("repo_id", repoId)
        .order("created_at", { ascending: true });

    if (error) return res.status(400).json({ message: error.message });

    // Always include 'main' even if no branch record exists
    const branchNames = (data ?? []).map((b) => b.name);
    if (!branchNames.includes("main")) {
        // Get latest commit on main to use as head
        const { data: mainCommit } = await sb
            .from("commits")
            .select("id")
            .eq("repo_id", repoId)
            .eq("branch", "main")
            .order("created_at", { ascending: false })
            .limit(1);

        const result = [
            {
                id: null,
                repo_id: repoId,
                name: "main",
                head_commit_id: mainCommit?.[0]?.id ?? null,
                created_by: null,
                created_at: null,
                isDefault: true,
            },
            ...(data ?? []),
        ];
        return res.json(result);
    }

    res.json(data ?? []);
}));

// ─── POST /api/branches — create a new branch ──────────────────────
router.post("/", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();

    const body = z.object({
        repoId: z.string().uuid(),
        name: z.string().min(1).max(100).regex(/^[a-zA-Z0-9_\-/.]+$/, "Invalid branch name"),
        fromBranch: z.string().default("main"),
    }).parse(req.body);

    // Get head commit of source branch
    const { data: headCommit } = await sb
        .from("commits")
        .select("id")
        .eq("repo_id", body.repoId)
        .eq("branch", body.fromBranch)
        .order("created_at", { ascending: false })
        .limit(1);

    const { data, error } = await sb
        .from("branches")
        .insert({
            repo_id: body.repoId,
            name: body.name,
            head_commit_id: headCommit?.[0]?.id ?? null,
            created_by: req.user.id,
        })
        .select("id,repo_id,name,head_commit_id,created_by,created_at")
        .single();

    if (error) {
        if (error.code === "23505") return res.status(409).json({ message: `Branch '${body.name}' already exists` });
        return res.status(400).json({ message: error.message });
    }

    res.status(201).json(data);
}));

// ─── DELETE /api/branches/:id — delete a branch ────────────────────
router.delete("/:id", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const branchId = req.params.id;

    const { data: branch } = await sb
        .from("branches")
        .select("name")
        .eq("id", branchId)
        .single();

    if (branch?.name === "main") {
        return res.status(400).json({ message: "Cannot delete the main branch" });
    }

    const { error } = await sb
        .from("branches")
        .delete()
        .eq("id", branchId);

    if (error) return res.status(400).json({ message: error.message });
    res.json({ deleted: true });
}));

export default router;

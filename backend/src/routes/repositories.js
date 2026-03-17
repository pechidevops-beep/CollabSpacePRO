import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { logActivity } from "./activity.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();
  const workspaceId = req.query.workspaceId;

  const q = sb.from("repositories").select("id,name,language,visibility,files_count,updated_at,workspace_id").order("updated_at", { ascending: false });
  const { data, error } = workspaceId ? await q.eq("workspace_id", workspaceId) : await q;

  if (error) return res.status(400).json({ message: error.message });

  res.json((data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    language: r.language,
    visibility: r.visibility,
    files: r.files_count,
    updatedAt: r.updated_at,
    workspaceId: r.workspace_id
  })));
}));

router.post("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();

  const body = z.object({
    workspaceId: z.string().uuid(),
    name: z.string().min(2),
    language: z.string().optional(),
    visibility: z.enum(["private", "public"]).default("private")
  }).parse(req.body);

  const { data, error } = await sb
    .from("repositories")
    .insert({
      workspace_id: body.workspaceId,
      name: body.name,
      language: body.language ?? null,
      visibility: body.visibility
    })
    .select("id,name,language,visibility,files_count,updated_at,workspace_id")
    .single();

  if (error) return res.status(400).json({ message: error.message });

  // Log activity
  await logActivity(sb, {
    workspaceId: body.workspaceId,
    userId: req.user.id,
    userEmail: req.user.email,
    action: "repo_created",
    targetType: "repository",
    targetId: data.id,
    targetName: data.name,
  });

  res.status(201).json({
    id: data.id,
    name: data.name,
    language: data.language,
    visibility: data.visibility,
    files: data.files_count,
    updatedAt: data.updated_at,
    workspaceId: data.workspace_id
  });
}));

// ─── Edit Repo ───────────────────────────────────────────────────────
router.patch("/:id", requireRole("admin", "owner"), asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();
  const repoId = req.params.id;
  const body = z.object({
    workspaceId: z.string().uuid(), // Required for RBAC middleware
    name: z.string().min(2).optional(),
    language: z.string().optional(),
    visibility: z.enum(["private", "public"]).optional(),
  }).parse(req.body);

  const { data, error } = await sb
    .from("repositories")
    .update({ name: body.name, language: body.language, visibility: body.visibility })
    .eq("id", repoId)
    .select("*")
    .single();

  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
}));

// ─── Delete Repo ─────────────────────────────────────────────────────
router.delete("/:id", requireRole("admin", "owner"), asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();
  const repoId = req.params.id;

  // Note: the frontend must pass ?workspaceId=xyz in the query to satisfy the requireRole middleware
  const { error } = await sb
    .from("repositories")
    .delete()
    .eq("id", repoId);

  if (error) return res.status(400).json({ message: error.message });
  res.json({ success: true });
}));

export default router;
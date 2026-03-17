import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// ─── GET all files for a repo ───────────────────────────────────────────
router.get("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();
  const repoId = req.query.repoId;
  if (!repoId) return res.status(400).json({ message: "repoId is required" });

  const { data, error } = await sb
    .from("repo_files")
    .select("id,path,language,content,updated_at")
    .eq("repo_id", repoId)
    .order("path", { ascending: true });

  if (error) return res.status(400).json({ message: error.message });
  res.json(data ?? []);
}));

// ─── CREATE file or folder ──────────────────────────────────────────────
router.post("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();

  const body = z.object({
    repoId: z.string().uuid(),
    path: z.string().min(1),
    language: z.string().optional(),
    content: z.string().default(""),
    isFolder: z.boolean().default(false),
  }).parse(req.body);

  // Folders are stored as a file with path ending in / and empty content
  const filePath = body.isFolder
    ? (body.path.endsWith("/") ? body.path : body.path + "/")
    : body.path;

  const { data, error } = await sb
    .from("repo_files")
    .insert({
      repo_id: body.repoId,
      path: filePath,
      language: body.isFolder ? null : (body.language ?? null),
      content: body.isFolder ? "" : body.content,
    })
    .select("id,path,language,content,updated_at")
    .single();

  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json(data);
}));

// ─── UPDATE / upsert file content ───────────────────────────────────────
router.put("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();

  const body = z.object({
    repoId: z.string().uuid(),
    path: z.string().min(1),
    language: z.string().optional(),
    content: z.string()
  }).parse(req.body);

  const { data, error } = await sb
    .from("repo_files")
    .upsert({
      repo_id: body.repoId,
      path: body.path,
      language: body.language ?? null,
      content: body.content
    }, { onConflict: "repo_id,path" })
    .select("id,path,language,content,updated_at")
    .single();

  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
}));

// ─── RENAME file ────────────────────────────────────────────────────────
router.patch("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();

  const body = z.object({
    repoId: z.string().uuid(),
    oldPath: z.string().min(1),
    newPath: z.string().min(1),
  }).parse(req.body);

  // If renaming a folder, rename all files under it too
  if (body.oldPath.endsWith("/")) {
    // Get all files within this folder
    const { data: children, error: findErr } = await sb
      .from("repo_files")
      .select("id,path")
      .eq("repo_id", body.repoId)
      .like("path", `${body.oldPath}%`);

    if (findErr) return res.status(400).json({ message: findErr.message });

    const newFolderPath = body.newPath.endsWith("/") ? body.newPath : body.newPath + "/";

    // Update each child path
    for (const child of (children ?? [])) {
      const newChildPath = newFolderPath + child.path.slice(body.oldPath.length);
      await sb.from("repo_files").update({ path: newChildPath }).eq("id", child.id);
    }

    // Also rename the folder entry itself
    const { data, error } = await sb
      .from("repo_files")
      .update({ path: newFolderPath })
      .eq("repo_id", body.repoId)
      .eq("path", body.oldPath)
      .select("id,path,language,content,updated_at")
      .maybeSingle();

    if (error) return res.status(400).json({ message: error.message });
    return res.json(data ?? { path: newFolderPath });
  }

  // Simple file rename
  const { data, error } = await sb
    .from("repo_files")
    .update({ path: body.newPath })
    .eq("repo_id", body.repoId)
    .eq("path", body.oldPath)
    .select("id,path,language,content,updated_at")
    .single();

  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
}));

// ─── DELETE file or folder ──────────────────────────────────────────────
router.delete("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();

  const body = z.object({
    repoId: z.string().uuid(),
    path: z.string().min(1),
  }).parse(req.body);

  // If deleting a folder, delete all files under it
  if (body.path.endsWith("/")) {
    const { error: childErr } = await sb
      .from("repo_files")
      .delete()
      .eq("repo_id", body.repoId)
      .like("path", `${body.path}%`);

    if (childErr) return res.status(400).json({ message: childErr.message });
  }

  const { error } = await sb
    .from("repo_files")
    .delete()
    .eq("repo_id", body.repoId)
    .eq("path", body.path);

  if (error) return res.status(400).json({ message: error.message });
  res.status(204).end();
}));

export default router;
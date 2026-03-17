import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { logActivity } from "./activity.js";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();
  const workspaceId = req.query.workspaceId;

  const q = sb.from("assignments").select("id,title,deadline,status,submissions,total,workspace_id").order("created_at", { ascending: false });
  const { data, error } = workspaceId ? await q.eq("workspace_id", workspaceId) : await q;

  if (error) return res.status(400).json({ message: error.message });

  res.json((data ?? []).map(a => ({
    id: a.id,
    title: a.title,
    deadline: a.deadline,
    status: a.status,
    submissions: a.submissions,
    total: a.total,
    workspaceId: a.workspace_id
  })));
}));

router.post("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();

  const body = z.object({
    workspaceId: z.string().uuid(),
    title: z.string().min(2),
    deadline: z.string().optional()
  }).parse(req.body);

  const { data, error } = await sb
    .from("assignments")
    .insert({
      workspace_id: body.workspaceId,
      title: body.title,
      deadline: body.deadline ?? null,
      status: "active"
    })
    .select("id,title,deadline,status,submissions,total,workspace_id")
    .single();

  if (error) return res.status(400).json({ message: error.message });

  // Log activity
  await logActivity(sb, {
    workspaceId: body.workspaceId,
    userId: req.user.id,
    userEmail: req.user.email,
    action: "assignment_created",
    targetType: "assignment",
    targetId: data.id,
    targetName: data.title,
  });

  res.status(201).json({
    id: data.id,
    title: data.title,
    deadline: data.deadline,
    status: data.status,
    submissions: data.submissions,
    total: data.total,
    workspaceId: data.workspace_id
  });
}));

// ─── DELETE /api/assignments/:id ─────────────────────────────────────
router.delete("/:id", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();
  const assignmentId = req.params.id;

  // Delete associated submissions first
  await sb.from("submissions").delete().eq("assignment_id", assignmentId);

  const { error } = await sb
    .from("assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) return res.status(400).json({ message: error.message });
  res.json({ success: true });
}));

export default router;
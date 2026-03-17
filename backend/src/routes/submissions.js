import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// ─── GET /api/submissions?assignmentId= ──────────────────────────────
router.get("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();
  const assignmentId = req.query.assignmentId;
  if (!assignmentId) return res.status(400).json({ message: "assignmentId is required" });

  const { data, error } = await sb
    .from("submissions")
    .select("id, assignment_id, user_id, user_email, content, file_url, created_at")
    .eq("assignment_id", assignmentId)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ message: error.message });
  res.json(data ?? []);
}));

// ─── POST /api/submissions ───────────────────────────────────────────
router.post("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();

  const body = z.object({
    assignmentId: z.string().uuid(),
    content: z.string().optional().default(""),
    fileUrl: z.string().optional().default(""),
  }).parse(req.body);

  // Check if assignment exists and is not past deadline
  const { data: assignment, error: aErr } = await sb
    .from("assignments")
    .select("id, deadline, status")
    .eq("id", body.assignmentId)
    .single();

  if (aErr || !assignment) return res.status(400).json({ message: "Assignment not found" });

  if (assignment.deadline && new Date(assignment.deadline) < new Date()) {
    return res.status(400).json({ message: "Deadline has passed — submission not allowed" });
  }

  // Check for duplicate submission
  const { data: existing } = await sb
    .from("submissions")
    .select("id")
    .eq("assignment_id", body.assignmentId)
    .eq("user_id", req.user.id)
    .single();

  if (existing) {
    // Update existing submission
    const { data, error } = await sb
      .from("submissions")
      .update({ content: body.content, file_url: body.fileUrl })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) return res.status(400).json({ message: error.message });

    // Increment submission count is not needed since updating
    return res.json(data);
  }

  // Insert new submission
  const { data, error } = await sb
    .from("submissions")
    .insert({
      assignment_id: body.assignmentId,
      user_id: req.user.id,
      user_email: req.user.email || "",
      content: body.content,
      file_url: body.fileUrl,
    })
    .select("*")
    .single();

  if (error) return res.status(400).json({ message: error.message });

  // Increment submission count on assignment
  await sb.rpc("increment_submissions", { aid: body.assignmentId }).catch(() => {
    // Fallback: manual increment
    sb.from("assignments")
      .select("submissions")
      .eq("id", body.assignmentId)
      .single()
      .then(({ data: a }) => {
        if (a) {
          sb.from("assignments")
            .update({ submissions: (a.submissions || 0) + 1 })
            .eq("id", body.assignmentId)
            .then(() => {});
        }
      });
  });

  res.status(201).json(data);
}));

export default router;

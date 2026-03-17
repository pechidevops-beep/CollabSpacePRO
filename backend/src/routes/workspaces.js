import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireRole } from "../middleware/requireRole.js";

const router = Router();

router.get("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();

  // Step 1: Get workspace IDs + roles from workspace_members (avoids RLS recursion)
  const { data: memberships, error: mErr } = await sb
    .from("workspace_members")
    .select("workspace_id,role")
    .eq("user_id", req.user.id);

  if (mErr) return res.status(400).json({ message: mErr.message });

  if (!memberships || memberships.length === 0) {
    return res.json([]);
  }

  const wsIds = memberships.map((m) => m.workspace_id);
  const roleMap = Object.fromEntries(memberships.map((m) => [m.workspace_id, m.role]));

  // Step 2: Get workspace details for those IDs
  const { data, error } = await sb
    .from("workspaces")
    .select("id,name,visibility,join_code,created_at")
    .in("id", wsIds)
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ message: error.message });

  const mapped = (data ?? []).map((w) => ({
    id: w.id,
    name: w.name,
    visibility: w.visibility,
    joinCode: w.join_code,
    role: roleMap[w.id] ?? "member",
  }));

  res.json(mapped);
}));

router.post("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();

  const body = z.object({
    name: z.string().min(2),
    visibility: z.enum(["private", "public"]).default("private")
  }).parse(req.body);

  const joinCode = `${body.name.replace(/\s+/g, "").slice(0, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;

  const { data: ws, error: wsErr } = await sb
    .from("workspaces")
    .insert({ name: body.name, visibility: body.visibility, join_code: joinCode, created_by: req.user.id })
    .select("id,name,visibility,join_code")
    .single();

  if (wsErr) return res.status(400).json({ message: wsErr.message });

  // owner membership
  const { error: mErr } = await sb
    .from("workspace_members")
    .insert({ workspace_id: ws.id, user_id: req.user.id, role: "admin" });

  if (mErr) return res.status(400).json({ message: mErr.message });

  res.status(201).json({ id: ws.id, name: ws.name, visibility: ws.visibility, joinCode: ws.join_code, role: "admin" });
}));

router.post("/join", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();

  const body = z.object({ joinCode: z.string().min(3) }).parse(req.body);

  // Get workspace by join code
  const { data: ws, error: wsErr } = await sb
    .from("workspaces")
    .select("id")
    .eq("join_code", body.joinCode)
    .single();

  if (wsErr || !ws) return res.status(400).json({ message: "Invalid join code" });

  // Check if already a member
  const { data: existing } = await sb
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", ws.id)
    .eq("user_id", req.user.id)
    .single();

  if (existing) return res.status(400).json({ message: "You are already a member of this workspace" });

  // Insert member
  const { error } = await sb
    .from("workspace_members")
    .insert({ workspace_id: ws.id, user_id: req.user.id, role: "editor" });

  if (error) return res.status(400).json({ message: error.message });

  res.json({ workspaceId: ws.id });
}));

// ─── Edit Workspace ──────────────────────────────────────────────────
router.patch("/:id", requireRole("admin", "owner"), asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();
  const workspaceId = req.params.id;
  const body = z.object({
    name: z.string().min(2).optional(),
    visibility: z.enum(["private", "public"]).optional(),
  }).parse(req.body);

  const { data, error } = await sb
    .from("workspaces")
    .update(body)
    .eq("id", workspaceId)
    .select("*")
    .single();

  if (error) return res.status(400).json({ message: error.message });
  res.json(data);
}));

// ─── Delete Workspace ────────────────────────────────────────────────
router.delete("/:id", requireRole("admin", "owner"), asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();
  const workspaceId = req.params.id;

  const { error } = await sb
    .from("workspaces")
    .delete()
    .eq("id", workspaceId);

  if (error) return res.status(400).json({ message: error.message });
  res.json({ success: true });
}));
router.get("/:id/members", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();
  const workspaceId = req.params.id;

  // Validate UUID format to prevent bad Supabase queries
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(workspaceId)) {
    return res.status(400).json({ message: "Invalid workspace ID format" });
  }

  const { data, error } = await sb
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspaceId);

  if (error) {
    console.error("[workspaces] members query error:", error);
    return res.status(400).json({ message: error.message });
  }

  // Fetch user details from Supabase Auth for each member
  const mapped = await Promise.all((data ?? []).map(async (m) => {
    let email = "";
    let displayName = "";
    try {
      const { data: userData } = await sb.auth.admin.getUserById(m.user_id);
      if (userData?.user) {
        email = userData.user.email || "";
        displayName = userData.user.user_metadata?.display_name || userData.user.user_metadata?.full_name || "";
      }
    } catch { /* ignore */ }
    return {
      userId: m.user_id,
      role: m.role,
      email,
      displayName,
    };
  }));

  res.json(mapped);
}));

router.patch("/:id/members/:userId", requireRole("admin", "owner"), asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();
  const workspaceId = req.params.id;
  const targetUserId = req.params.userId;
  const { role } = z.object({ role: z.enum(["admin", "editor", "viewer"]) }).parse(req.body);

  const { error } = await sb
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId);

  if (error) return res.status(400).json({ message: error.message });
  res.json({ success: true, role });
}));

export default router;
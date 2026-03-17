import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/summary", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();
  const userId = req.user.id;

  // 1. Get workspace IDs this user belongs to
  const { data: memberships, error: mErr } = await sb
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId);

  if (mErr) return res.status(400).json({ message: mErr.message });

  const workspaceIds = (memberships ?? []).map((m) => m.workspace_id);
  const workspaceCount = workspaceIds.length;

  // 2. Count repos only in user's workspaces
  let repoCount = 0;
  if (workspaceIds.length > 0) {
    const { count, error: rErr } = await sb
      .from("repositories")
      .select("id", { count: "exact", head: true })
      .in("workspace_id", workspaceIds);

    if (rErr) return res.status(400).json({ message: rErr.message });
    repoCount = count ?? 0;
  }

  // 3. Count assignments in user's workspaces
  let assignmentCount = 0;
  if (workspaceIds.length > 0) {
    const { count, error: aErr } = await sb
      .from("assignments")
      .select("id", { count: "exact", head: true })
      .in("workspace_id", workspaceIds);

    if (aErr) return res.status(400).json({ message: aErr.message });
    assignmentCount = count ?? 0;
  }

  // 4. Count unique members in user's workspaces
  let memberCount = 0;
  if (workspaceIds.length > 0) {
    const { data: members, error: memErr } = await sb
      .from("workspace_members")
      .select("user_id")
      .in("workspace_id", workspaceIds);

    if (!memErr && members) {
      const uniqueUsers = new Set(members.map((m) => m.user_id));
      memberCount = uniqueUsers.size;
    }
  }

  res.json({
    workspaces: workspaceCount,
    repositories: repoCount,
    assignments: assignmentCount,
    members: memberCount,
  });
}));

export default router;
import { Router } from "express";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// ─── GET /api/activity — list activity for user's workspaces ────────
router.get("/", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);

    // Get workspace IDs this user belongs to
    const { data: memberships } = await sb
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", userId);

    const wsIds = (memberships ?? []).map((m) => m.workspace_id);
    if (wsIds.length === 0) return res.json([]);

    const { data, error } = await sb
        .from("activity_logs")
        .select("*")
        .in("workspace_id", wsIds)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error) return res.status(400).json({ message: error.message });
    res.json(data ?? []);
}));

export default router;

// ─── Helper: log an activity event ──────────────────────────────────
export async function logActivity(sb, {
    workspaceId,
    userId,
    userEmail = "",
    action,
    targetType,
    targetId,
    targetName,
    metadata = {},
}) {
    try {
        await sb.from("activity_logs").insert({
            workspace_id: workspaceId,
            user_id: userId,
            user_email: userEmail,
            action,
            target_type: targetType,
            target_id: targetId,
            target_name: targetName,
            metadata,
        });
    } catch {
        // Don't fail the main operation if logging fails
    }
}

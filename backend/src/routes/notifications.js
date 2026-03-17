import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// ─── GET /api/notifications — list user notifications ───────────────
router.get("/", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const unreadOnly = req.query.unread === "true";

    let q = sb
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (unreadOnly) q = q.eq("read", false);

    const { data, error } = await q;
    if (error) return res.status(400).json({ message: error.message });
    res.json(data ?? []);
}));

// ─── GET /api/notifications/count — unread count ────────────────────
router.get("/count", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const userId = req.user.id;

    const { count, error } = await sb
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);

    if (error) return res.status(400).json({ message: error.message });
    res.json({ unread: count ?? 0 });
}));

// ─── PATCH /api/notifications/:id/read — mark as read ───────────────
router.patch("/:id/read", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const { error } = await sb
        .from("notifications")
        .update({ read: true })
        .eq("id", req.params.id)
        .eq("user_id", req.user.id);

    if (error) return res.status(400).json({ message: error.message });
    res.json({ ok: true });
}));

// ─── PATCH /api/notifications/read-all — mark all as read ───────────
router.patch("/read-all", asyncHandler(async (req, res) => {
    const sb = supabaseAdmin();
    const { error } = await sb
        .from("notifications")
        .update({ read: true })
        .eq("user_id", req.user.id)
        .eq("read", false);

    if (error) return res.status(400).json({ message: error.message });
    res.json({ ok: true });
}));

export default router;

// ─── Helper: send notification to a user ─────────────────────────────
export async function sendNotification(sb, {
    userId,
    type,
    title,
    body = "",
    link = "",
    workspaceId,
    actorId,
    actorEmail = "",
    metadata = {},
}) {
    try {
        await sb.from("notifications").insert({
            user_id: userId,
            type,
            title,
            body,
            link,
            workspace_id: workspaceId,
            actor_id: actorId,
            actor_email: actorEmail,
            metadata,
        });
    } catch {
        // Don't fail main operation
    }
}

// ─── Helper: notify all members of a workspace ──────────────────────
export async function notifyWorkspaceMembers(sb, {
    workspaceId,
    excludeUserId,
    type,
    title,
    body = "",
    link = "",
    actorId,
    actorEmail = "",
    metadata = {},
}) {
    try {
        const { data: members } = await sb
            .from("workspace_members")
            .select("user_id")
            .eq("workspace_id", workspaceId);

        if (!members?.length) return;

        const notifications = members
            .filter((m) => m.user_id !== excludeUserId)
            .map((m) => ({
                user_id: m.user_id,
                type,
                title,
                body,
                link,
                workspace_id: workspaceId,
                actor_id: actorId,
                actor_email: actorEmail,
                metadata,
            }));

        if (notifications.length > 0) {
            await sb.from("notifications").insert(notifications);
        }
    } catch {
        // Don't fail main operation
    }
}

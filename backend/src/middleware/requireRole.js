import { supabaseAdmin } from "../lib/supabaseAdmin.js";

/**
 * RBAC Middleware — checks workspace role for the current user.
 * Usage: router.post("/", requireRole("admin", "editor"), handler)
 *
 * Roles: admin, editor, viewer
 *   - admin: full access (manage members, settings, delete)
 *   - editor: create/edit content (repos, assignments, files, commits)
 *   - viewer: read-only access
 *
 * The workspace ID must be available in req.body.workspaceId or req.query.workspaceId
 */
export function requireRole(...allowedRoles) {
    return async (req, res, next) => {
        try {
            const workspaceId = req.body?.workspaceId || req.query?.workspaceId || req.params?.workspaceId || req.params?.id;
            if (!workspaceId) return next(); // Skip if no workspace context

            const sb = supabaseAdmin();
            const { data: membership } = await sb
                .from("workspace_members")
                .select("role")
                .eq("workspace_id", workspaceId)
                .eq("user_id", req.user.id)
                .single();

            if (!membership) {
                return res.status(403).json({ message: "Not a member of this workspace" });
            }

            const role = membership.role || "editor";
            if (!allowedRoles.includes(role)) {
                return res.status(403).json({ message: `Requires role: ${allowedRoles.join(" or ")}. You have: ${role}` });
            }

            req.workspaceRole = role;
            next();
        } catch {
            next();
        }
    };
}

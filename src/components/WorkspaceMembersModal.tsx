import { useState } from "react";
import { motion } from "framer-motion";
import { X, ShieldAlert, User, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "@/components/ui/sonner";

type Member = {
    userId: string;
    role: string;
    joinedAt: string;
    email: string;
    displayName: string;
};

export default function WorkspaceMembersModal({
    workspaceId,
    workspaceName,
    currentUserRole,
    onClose,
}: {
    workspaceId: string;
    workspaceName: string;
    currentUserRole: string; // The role of the person viewing the modal
    onClose: () => void;
}) {
    const qc = useQueryClient();

    const { data: members = [], isLoading } = useQuery({
        queryKey: ["workspace-members", workspaceId],
        queryFn: () => apiFetch<Member[]>(`/workspaces/${workspaceId}/members`),
    });

    const updateRole = useMutation({
        mutationFn: ({ userId, role }: { userId: string; role: string }) =>
            apiFetch(`/workspaces/${workspaceId}/members/${userId}`, {
                method: "PATCH",
                body: JSON.stringify({ role }),
            }),
        onSuccess: () => {
            toast.success("Role updated successfully");
            qc.invalidateQueries({ queryKey: ["workspace-members", workspaceId] });
            qc.invalidateQueries({ queryKey: ["workspaces"] });
        },
        onError: (e: any) => {
            toast.error(e.message || "Failed to update role");
        },
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-border bg-secondary/30 px-5 py-4">
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Workspace Members</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">{workspaceName}</p>
                    </div>
                    <button onClick={onClose} className="rounded-md p-1.5 hover:bg-secondary text-muted-foreground transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <div className="p-5 max-h-[60vh] overflow-y-auto space-y-3">
                    {isLoading ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">Loading members...</div>
                    ) : members.length === 0 ? (
                        <div className="py-8 text-center text-sm text-muted-foreground">No members found</div>
                    ) : (
                        members.map((m) => (
                            <div key={m.userId} className="flex items-center justify-between rounded-lg border border-border/50 bg-background p-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                                        <User className="h-4 w-4 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-foreground">
                                            {m.displayName || m.email.split("@")[0]}
                                        </p>
                                        <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0 ml-4">
                                    {["admin","owner"].includes(currentUserRole) ? (
                                        <select
                                            className="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                                            value={m.role}
                                            disabled={updateRole.isPending}
                                            onChange={(e) => {
                                                if (e.target.value !== m.role) {
                                                    updateRole.mutate({ userId: m.userId, role: e.target.value });
                                                }
                                            }}
                                        >
                                            <option value="admin">Admin</option>
                                            <option value="editor">Editor</option>
                                            <option value="viewer">Viewer</option>
                                        </select>
                                    ) : (
                                        <Badge variant="secondary" className="text-[10px] capitalize">
                                            {m.role}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    );
}

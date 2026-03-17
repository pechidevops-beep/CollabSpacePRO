import { Plus, Users, Lock, Globe, Copy, Settings, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import WorkspaceMembersModal from "@/components/WorkspaceMembersModal";
import { apiFetch } from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import { useNavigate } from "react-router-dom";

type Workspace = {
  id: string;
  name: string;
  visibility: "private" | "public";
  joinCode: string;
  role: string;
};

const Workspaces = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [joinCode, setJoinCode] = useState("");
  const [selectedWorkspaceForMembers, setSelectedWorkspaceForMembers] = useState<Workspace | null>(null);

  // Edit State
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editName, setEditName] = useState("");
  const [editVisibility, setEditVisibility] = useState<"private" | "public">("private");

  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => apiFetch<Workspace[]>("/workspaces"),
  });

  const createWs = useMutation({
    mutationFn: () => apiFetch<Workspace>("/workspaces", { method: "POST", body: JSON.stringify({ name, visibility }) }),
    onSuccess: () => {
      toast.success("Workspace created");
      setShowCreate(false);
      setName("");
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to create workspace");
    },
  });

  const joinWs = useMutation({
    mutationFn: () => apiFetch<{ workspaceId: string }>("/workspaces/join", { method: "POST", body: JSON.stringify({ joinCode }) }),
    onSuccess: () => {
      toast.success("Joined workspace");
      setJoinCode("");
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to join workspace");
    },
  });

  const editWs = useMutation({
    mutationFn: () => apiFetch<Workspace>(`/workspaces/${editingWorkspace?.id}`, { method: "PATCH", body: JSON.stringify({ name: editName, visibility: editVisibility }) }),
    onSuccess: () => {
      toast.success("Workspace updated");
      setEditingWorkspace(null);
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Update failed");
    },
  });

  const deleteWs = useMutation({
    mutationFn: (id: string) => apiFetch(`/workspaces/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Workspace deleted");
      qc.invalidateQueries({ queryKey: ["workspaces"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workspaces</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your teams and collaboration spaces.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setShowCreate(!showCreate)}>
          <Plus className="h-4 w-4" /> Create Workspace
        </Button>
      </div>

      {showCreate && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-xl border border-primary/30 bg-card p-6 shadow-card glow-primary"
        >
          <h3 className="font-semibold text-card-foreground mb-4">Create New Workspace</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Name</label>
              <input
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="e.g. CS301 — Fall 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Visibility</label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as "private" | "public")}
              >
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => createWs.mutate()} disabled={createWs.isPending || !name.trim()}>
              Create
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      {/* Edit Workspace Modal */}
      {editingWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
          >
            <h3 className="text-lg font-semibold text-card-foreground mb-4">Edit Workspace</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Name</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">Visibility</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary"
                  value={editVisibility}
                  onChange={(e) => setEditVisibility(e.target.value as "private" | "public")}
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" size="sm" onClick={() => setEditingWorkspace(null)}>
                Cancel
              </Button>
              <Button size="sm" onClick={() => editWs.mutate()} disabled={editWs.isPending || !editName.trim()}>
                Save changes
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="text-sm text-muted-foreground mb-1 block">Join workspace</label>
            <input
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Enter join code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={() => joinWs.mutate()} disabled={joinWs.isPending || !joinCode.trim()}>
            Join
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {workspaces.map((ws, i) => (
          <motion.div
            key={ws.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover hover:border-primary/20 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground">{ws.name}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="capitalize">{ws.visibility}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={["admin","owner"].includes(ws.role?.toLowerCase()) ? "default" : "secondary"} className="text-xs">
                  {ws.role}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {ws.visibility === "private" ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                  {ws.visibility}
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Join code:</span>
                <code className="font-mono bg-secondary px-2 py-0.5 rounded text-secondary-foreground">{ws.joinCode}</code>
                <button
                  className="text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(ws.joinCode);
                    toast.success("Copied join code!");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedWorkspaceForMembers(ws)}
                >
                  <Users className="h-3.5 w-3.5 mr-1.5" />
                  Members
                </Button>
                {["admin","owner"].includes(ws.role?.toLowerCase()) && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-foreground px-2"
                      onClick={() => {
                        setEditingWorkspace(ws);
                        setEditName(ws.name);
                        setEditVisibility(ws.visibility);
                      }}
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete ${ws.name}? This cannot be undone.`)) {
                          deleteWs.mutate(ws.id);
                        }
                      }}
                      disabled={deleteWs.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    localStorage.setItem("activeWorkspaceId", ws.id);
                    navigate("/repositories");
                  }}
                >
                  Open →
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedWorkspaceForMembers && (
          <WorkspaceMembersModal
            workspaceId={selectedWorkspaceForMembers.id}
            workspaceName={selectedWorkspaceForMembers.name}
            currentUserRole={selectedWorkspaceForMembers.role}
            onClose={() => setSelectedWorkspaceForMembers(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Workspaces;

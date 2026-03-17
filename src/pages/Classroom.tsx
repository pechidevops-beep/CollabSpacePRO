import { motion, AnimatePresence } from "framer-motion";
import { Plus, BookOpen, Clock, CheckCircle2, AlertCircle, Send, FileText, Trash2, Settings, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import { useMemo, useState } from "react";

type Assignment = {
  id: string;
  title: string;
  deadline: string | null;
  submissions: number;
  total: number;
  status: "active" | "completed" | "overdue";
  workspaceId: string;
};

type Submission = {
  id: string;
  assignment_id: string;
  user_id: string;
  user_email: string;
  content: string;
  file_url: string;
  created_at: string;
};

type Workspace = {
  id: string;
  name: string;
  role: string;
};

const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; className: string }> = {
  active: { icon: Clock, label: "Active", className: "bg-info/15 text-info border-info/30" },
  completed: { icon: CheckCircle2, label: "Completed", className: "bg-success/15 text-success border-success/30" },
  overdue: { icon: AlertCircle, label: "Overdue", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const Classroom = () => {
  const qc = useQueryClient();
  const workspaceId = useMemo(() => localStorage.getItem("activeWorkspaceId"), []);
  const [title, setTitle] = useState("");
  const [deadline, setDeadline] = useState("");

  // Submission modal state
  const [submittingFor, setSubmittingFor] = useState<Assignment | null>(null);
  const [subContent, setSubContent] = useState("");
  const [subFileUrl, setSubFileUrl] = useState("");

  // Expanded submissions view
  const [expandedAssignment, setExpandedAssignment] = useState<string | null>(null);

  // Edit state
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => apiFetch<Workspace[]>("/workspaces"),
  });

  const currentWorkspace = workspaces.find((w) => w.id === workspaceId);
  const isOwner = ["admin", "owner"].includes(currentWorkspace?.role?.toLowerCase() ?? "");

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", workspaceId],
    queryFn: () => apiFetch<Assignment[]>(`/assignments?workspaceId=${workspaceId}`),
    enabled: Boolean(workspaceId),
  });

  const createAssignment = useMutation({
    mutationFn: () => {
      if (!workspaceId) throw new Error("Select a workspace first");
      return apiFetch<Assignment>("/assignments", {
        method: "POST",
        body: JSON.stringify({ workspaceId, title, deadline: deadline || undefined }),
      });
    },
    onSuccess: () => {
      toast.success("Assignment created");
      setTitle("");
      setDeadline("");
      qc.invalidateQueries({ queryKey: ["assignments", workspaceId] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Failed to create assignment");
    },
  });

  const deleteAssignment = useMutation({
    mutationFn: (id: string) => apiFetch(`/assignments/${id}?workspaceId=${workspaceId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Assignment deleted");
      qc.invalidateQueries({ queryKey: ["assignments", workspaceId] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const submitWork = useMutation({
    mutationFn: () => {
      if (!submittingFor) throw new Error("No assignment selected");
      return apiFetch<Submission>("/submissions", {
        method: "POST",
        body: JSON.stringify({
          assignmentId: submittingFor.id,
          content: subContent,
          fileUrl: subFileUrl,
        }),
      });
    },
    onSuccess: () => {
      toast.success("Submission saved!");
      setSubmittingFor(null);
      setSubContent("");
      setSubFileUrl("");
      qc.invalidateQueries({ queryKey: ["assignments", workspaceId] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "Submission failed");
    },
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Classroom</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage assignments and track submissions.</p>
        </div>
        {isOwner && (
          <div className="flex items-center gap-2">
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Assignment title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <input
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
            <Button size="sm" className="gap-2" onClick={() => createAssignment.mutate()} disabled={createAssignment.isPending || !title.trim()}>
              <Plus className="h-4 w-4" /> New Assignment
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {!workspaceId ? (
          <div className="text-sm text-muted-foreground">Select a workspace from Workspaces page first.</div>
        ) : null}

        {assignments.map((a, i) => {
          const sc = statusConfig[a.status] || statusConfig.active;
          const StatusIcon = sc.icon;
          const progress = a.total > 0 ? Math.round((a.submissions / a.total) * 100) : 0;
          const isExpanded = expandedAssignment === a.id;
          const isPastDeadline = a.deadline && new Date(a.deadline) < new Date();

          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-card-foreground">{a.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Due {a.deadline ? new Date(a.deadline).toLocaleDateString() : "—"}
                      {isPastDeadline && <span className="text-destructive ml-1">(Past deadline)</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs gap-1 ${sc.className}`}>
                    <StatusIcon className="h-3 w-3" />
                    {sc.label}
                  </Badge>

                  {/* Submit button for members */}
                  {!isPastDeadline && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => {
                        setSubmittingFor(a);
                        setSubContent("");
                        setSubFileUrl("");
                      }}
                    >
                      <Send className="h-3 w-3" /> Submit
                    </Button>
                  )}

                  {/* Admin controls */}
                  {isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      onClick={() => {
                        if (confirm(`Delete assignment "${a.title}"?`)) {
                          deleteAssignment.mutate(a.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Submissions</span>
                  <span>{a.submissions}/{a.total}</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: i * 0.1 }}
                  />
                </div>
              </div>

              {/* View Submissions toggle (for owners) */}
              {isOwner && (
                <button
                  className="mt-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setExpandedAssignment(isExpanded ? null : a.id)}
                >
                  {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {isExpanded ? "Hide" : "View"} Submissions
                </button>
              )}

              {/* Submissions list */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <SubmissionsList assignmentId={a.id} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Submission Modal */}
      <AnimatePresence>
        {submittingFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground">Submit Work</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{submittingFor.title}</p>
                </div>
                <button onClick={() => setSubmittingFor(null)} className="rounded-md p-1.5 hover:bg-secondary text-muted-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">Your Work (text, notes, code)</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary min-h-[120px] resize-y"
                    placeholder="Describe your work, paste code, or write your submission..."
                    value={subContent}
                    onChange={(e) => setSubContent(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    File/Media URL <span className="text-xs text-muted-foreground">(optional — paste a link to image, video, or document)</span>
                  </label>
                  <input
                    type="url"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:ring-2 focus:ring-primary"
                    placeholder="https://drive.google.com/... or https://youtu.be/..."
                    value={subFileUrl}
                    onChange={(e) => setSubFileUrl(e.target.value)}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button variant="ghost" size="sm" onClick={() => setSubmittingFor(null)}>Cancel</Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => submitWork.mutate()}
                  disabled={submitWork.isPending || (!subContent.trim() && !subFileUrl.trim())}
                >
                  <Send className="h-3.5 w-3.5" />
                  {submitWork.isPending ? "Submitting..." : "Submit"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Submissions List Component ──────────────────────────────────────
function SubmissionsList({ assignmentId }: { assignmentId: string }) {
  const { data: submissions = [], isLoading } = useQuery({
    queryKey: ["submissions", assignmentId],
    queryFn: () => apiFetch<Submission[]>(`/submissions?assignmentId=${assignmentId}`),
  });

  if (isLoading) return <div className="py-3 text-xs text-muted-foreground text-center">Loading submissions...</div>;
  if (submissions.length === 0) return <div className="py-3 text-xs text-muted-foreground text-center">No submissions yet.</div>;

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3">
      {submissions.map((s) => (
        <div key={s.id} className="rounded-lg border border-border/50 bg-background p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-foreground">{s.user_email || "Anonymous"}</span>
            <span className="text-[10px] text-muted-foreground">{new Date(s.created_at).toLocaleString()}</span>
          </div>
          {s.content && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap mt-1">{s.content}</p>
          )}
          {s.file_url && (
            <a
              href={s.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:underline"
            >
              <FileText className="h-3 w-3" />
              View attachment
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

export default Classroom;

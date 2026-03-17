import { motion } from "framer-motion";
import {
  FolderGit2, Users, BookOpen, Activity, ArrowRight, Plus,
  GitCommitHorizontal, FileCode2, User, Clock,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

type DashboardSummary = {
  workspaces: number;
  repositories: number;
  assignments: number;
  members: number;
};

type ActivityLog = {
  id: string;
  user_email: string;
  action: string;
  target_type: string;
  target_name: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

const actionLabels: Record<string, { verb: string; icon: typeof FolderGit2; color: string }> = {
  repo_created: { verb: "created repository", icon: FolderGit2, color: "text-accent" },
  commit_pushed: { verb: "pushed commit to", icon: GitCommitHorizontal, color: "text-primary" },
  assignment_created: { verb: "created assignment", icon: BookOpen, color: "text-success" },
  member_joined: { verb: "joined workspace", icon: Users, color: "text-warning" },
  file_created: { verb: "created file in", icon: FileCode2, color: "text-info" },
  pr_created: { verb: "opened pull request", icon: GitCommitHorizontal, color: "text-purple-400" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const quickLinks = [
  { label: "New Workspace", href: "/workspaces", icon: Users },
  { label: "New Repository", href: "/repositories", icon: FolderGit2 },
  { label: "Open Editor", href: "/editor", icon: Activity },
];

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const Dashboard = () => {
  const { data } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => apiFetch<DashboardSummary>("/dashboard/summary"),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ["activity"],
    queryFn: () => apiFetch<ActivityLog[]>("/activity?limit=20"),
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const stats = [
    { label: "Workspaces", value: String(data?.workspaces ?? 0), icon: Users, color: "text-primary" },
    { label: "Repositories", value: String(data?.repositories ?? 0), icon: FolderGit2, color: "text-accent" },
    { label: "Assignments", value: String(data?.assignments ?? 0), icon: BookOpen, color: "text-success" },
    { label: "Active Members", value: String(data?.members ?? 0), icon: Activity, color: "text-warning" },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back — here's your overview.</p>
        </div>
        <Link to="/workspaces">
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> New Workspace
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <motion.div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: 0.06 } } }}
      >
        {stats.map((s) => (
          <motion.div
            key={s.label}
            variants={item}
            className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <s.icon className={`h-5 w-5 ${s.color}`} />
              <span className="text-2xl font-bold text-card-foreground">{s.value}</span>
            </div>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold mb-4 text-card-foreground">Recent Activity</h2>

          {activities.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              No recent activity yet. Create a repository or push a commit to see activity here.
            </div>
          ) : (
            <div className="space-y-1">
              {activities.map((act, i) => {
                const info = actionLabels[act.action] || {
                  verb: act.action.replace(/_/g, " "),
                  icon: Activity,
                  color: "text-muted-foreground",
                };
                const Icon = info.icon;
                const userName = act.user_email?.split("@")[0] || "Unknown";

                return (
                  <motion.div
                    key={act.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-start gap-3 py-2.5 px-2 rounded-lg hover:bg-secondary/30 transition-colors"
                  >
                    <div className={`mt-1 h-7 w-7 rounded-full bg-secondary/80 flex items-center justify-center shrink-0`}>
                      <Icon className={`h-3.5 w-3.5 ${info.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">
                        <span className="font-medium">{userName}</span>{" "}
                        <span className="text-muted-foreground">{info.verb}</span>{" "}
                        <span className="font-medium text-primary">{act.target_name}</span>
                        {act.action === "commit_pushed" && act.metadata?.message && (
                          <span className="text-muted-foreground"> — "{String(act.metadata.message)}"</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {timeAgo(act.created_at)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h2 className="text-lg font-semibold mb-4 text-card-foreground">Quick Actions</h2>
          <div className="space-y-3">
            {quickLinks.map((l) => (
              <Link
                key={l.label}
                to={l.href}
                className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-secondary/50 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <l.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-card-foreground">{l.label}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

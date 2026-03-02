import { motion } from "framer-motion";
import { FolderGit2, Users, BookOpen, Activity, ArrowRight, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "Workspaces", value: "3", icon: Users, color: "text-primary" },
  { label: "Repositories", value: "12", icon: FolderGit2, color: "text-accent" },
  { label: "Assignments", value: "5", icon: BookOpen, color: "text-success" },
  { label: "Active Members", value: "18", icon: Activity, color: "text-warning" },
];

const recentActivity = [
  { action: "Pushed to", target: "auth-service/main.py", time: "2 min ago", type: "push" },
  { action: "Created repo", target: "data-structures-lab", time: "1 hour ago", type: "create" },
  { action: "Submitted", target: "Assignment #3 — Sorting", time: "3 hours ago", type: "submit" },
  { action: "Joined workspace", target: "CS301 — Fall 2026", time: "Yesterday", type: "join" },
];

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
          <div className="space-y-4">
            {recentActivity.map((a, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span className="text-sm text-card-foreground">
                    {a.action}{" "}
                    <span className="font-mono text-xs text-primary">{a.target}</span>
                  </span>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
              </motion.div>
            ))}
          </div>
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

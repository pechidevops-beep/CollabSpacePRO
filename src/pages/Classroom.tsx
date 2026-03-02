import { motion } from "framer-motion";
import { Plus, BookOpen, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockAssignments = [
  { id: "1", title: "Sorting Algorithms Lab", workspace: "CS301", deadline: "Mar 10, 2026", submissions: 28, total: 32, status: "active" },
  { id: "2", title: "REST API Project", workspace: "WebDev Bootcamp", deadline: "Mar 5, 2026", submissions: 15, total: 15, status: "completed" },
  { id: "3", title: "Neural Network Basics", workspace: "ML Research Lab", deadline: "Mar 15, 2026", submissions: 2, total: 7, status: "active" },
  { id: "4", title: "Binary Tree Traversal", workspace: "CS301", deadline: "Feb 28, 2026", submissions: 30, total: 32, status: "overdue" },
];

const statusConfig: Record<string, { icon: typeof CheckCircle2; label: string; className: string }> = {
  active: { icon: Clock, label: "Active", className: "bg-info/15 text-info border-info/30" },
  completed: { icon: CheckCircle2, label: "Completed", className: "bg-success/15 text-success border-success/30" },
  overdue: { icon: AlertCircle, label: "Overdue", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const Classroom = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Classroom</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage assignments and track submissions.</p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> New Assignment
        </Button>
      </div>

      <div className="grid gap-4">
        {mockAssignments.map((a, i) => {
          const sc = statusConfig[a.status];
          const StatusIcon = sc.icon;
          const progress = Math.round((a.submissions / a.total) * 100);

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
                    <p className="text-xs text-muted-foreground mt-0.5">{a.workspace} · Due {a.deadline}</p>
                  </div>
                </div>
                <Badge variant="outline" className={`text-xs gap-1 ${sc.className}`}>
                  <StatusIcon className="h-3 w-3" />
                  {sc.label}
                </Badge>
              </div>
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
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Classroom;

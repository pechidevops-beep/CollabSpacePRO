import { motion } from "framer-motion";
import { Plus, Users, Lock, Globe, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const mockWorkspaces = [
  { id: "1", name: "CS301 — Data Structures", members: 32, repos: 8, visibility: "private", role: "Owner", joinCode: "CS301-XK9" },
  { id: "2", name: "WebDev Bootcamp", members: 15, repos: 4, visibility: "public", role: "Member", joinCode: "WDB-P42" },
  { id: "3", name: "ML Research Lab", members: 7, repos: 12, visibility: "private", role: "Owner", joinCode: "MLR-Z81" },
];

const Workspaces = () => {
  const [showCreate, setShowCreate] = useState(false);

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
              <input className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="e.g. CS301 — Fall 2026" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Visibility</label>
              <select className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
                <option>Private</option>
                <option>Public</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm">Create</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      <div className="grid gap-4">
        {mockWorkspaces.map((ws, i) => (
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
                    <span>{ws.members} members</span>
                    <span>•</span>
                    <span>{ws.repos} repos</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={ws.role === "Owner" ? "default" : "secondary"} className="text-xs">
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
                <button className="text-muted-foreground hover:text-primary transition-colors">
                  <Copy className="h-3 w-3" />
                </button>
              </div>
              <Button variant="ghost" size="sm" className="text-xs">Open →</Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Workspaces;

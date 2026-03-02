import { motion } from "framer-motion";
import { Plus, FolderGit2, Lock, Globe, FileCode2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

const mockRepos = [
  { id: "1", name: "auth-service", workspace: "CS301", language: "Python", files: 8, visibility: "private", updatedAt: "2 hours ago" },
  { id: "2", name: "sorting-algorithms", workspace: "CS301", language: "Java", files: 14, visibility: "public", updatedAt: "1 day ago" },
  { id: "3", name: "ml-pipeline", workspace: "ML Research Lab", language: "Python", files: 22, visibility: "private", updatedAt: "3 days ago" },
  { id: "4", name: "react-portfolio", workspace: "WebDev Bootcamp", language: "JavaScript", files: 6, visibility: "public", updatedAt: "1 week ago" },
];

const langColor: Record<string, string> = {
  Python: "bg-info/20 text-info",
  Java: "bg-warning/20 text-warning",
  JavaScript: "bg-accent/20 text-accent",
};

const Repositories = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Repositories</h1>
          <p className="text-sm text-muted-foreground mt-1">Browse and manage your code repositories.</p>
        </div>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> New Repository
        </Button>
      </div>

      <div className="grid gap-4">
        {mockRepos.map((repo, i) => (
          <motion.div
            key={repo.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-border bg-card p-5 shadow-card hover:shadow-card-hover hover:border-primary/20 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FolderGit2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-card-foreground font-mono text-sm">{repo.name}</h3>
                    {repo.visibility === "private" ? <Lock className="h-3 w-3 text-muted-foreground" /> : <Globe className="h-3 w-3 text-muted-foreground" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{repo.workspace}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={`text-xs ${langColor[repo.language] || ""}`}>
                  {repo.language}
                </Badge>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <FileCode2 className="h-3 w-3" />
                  {repo.files} files
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Updated {repo.updatedAt}</span>
              <Link to="/editor">
                <Button variant="ghost" size="sm" className="text-xs">Open in Editor →</Button>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Repositories;

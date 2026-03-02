import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Code2, GitBranch, GraduationCap, Play, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: GitBranch,
    title: "Repository Management",
    description: "GitHub-style repos with folder structures, file editing, and version tracking.",
  },
  {
    icon: GraduationCap,
    title: "Classroom System",
    description: "Create assignments, set deadlines, and manage submissions seamlessly.",
  },
  {
    icon: Code2,
    title: "In-Browser Editor",
    description: "Monaco-powered editor with multi-file tabs, syntax highlighting, and more.",
  },
  {
    icon: Play,
    title: "Code Execution",
    description: "Run Java & Python projects securely in Docker-sandboxed containers.",
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Create workspaces, invite members, and collaborate in real-time.",
  },
  {
    icon: Shield,
    title: "Secure & Scalable",
    description: "Resource-limited containers, no network access, full isolation.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background dark">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 glass-strong">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Code2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">CollabSpace</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/dashboard">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--glow-primary)),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(var(--glow-accent)),transparent_60%)]" />
        <div className="container relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground mb-8">
              <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
              Now in Beta — Start building today
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-[1.1]">
              Code. Collaborate.
              <br />
              <span className="gradient-text">Execute.</span>
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground mb-10">
              The unified platform for repository management, classroom assignments, and secure in-browser code execution — all in one place.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link to="/dashboard">
                <Button size="lg" className="gap-2 glow-primary">
                  Launch Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/editor">
                <Button variant="outline" size="lg" className="gap-2">
                  Try the Editor <Code2 className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="container">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              A complete ecosystem for development teams and academic environments.
            </p>
          </motion.div>
          <motion.div
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={item}
                className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:shadow-card-hover hover:border-primary/30"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-card-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <span>© 2026 CollabSpace</span>
          <span className="font-mono text-xs">v0.1.0-beta</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;

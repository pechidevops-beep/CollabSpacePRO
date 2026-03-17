import dns from "node:dns";
// Prefer IPv4 (some Indian ISPs block IPv6)
dns.setDefaultResultOrder("ipv4first");

import "dotenv/config";
import express from "express";
import cors from "cors";

import { requireUser } from "./middleware/requireUser.js";
import { errorHandler } from "./middleware/errorHandler.js";
import workspacesRouter from "./routes/workspaces.js";
import repositoriesRouter from "./routes/repositories.js";
import assignmentsRouter from "./routes/assignments.js";
import dashboardRouter from "./routes/dashboard.js";
import repoFilesRouter from "./routes/repoFiles.js";
import runRouter from "./routes/run.js";
import commitsRouter from "./routes/commits.js";
import activityRouter from "./routes/activity.js";
import branchesRouter from "./routes/branches.js";
import pullRequestsRouter from "./routes/pullRequests.js";
import notificationsRouter from "./routes/notifications.js";
import submissionsRouter from "./routes/submissions.js";
import { attachTerminalWS } from "./routes/terminal.js";
import { attachYjsWS } from "./routes/yjs.js";

const app = express();

app.use(cors({ origin: true, credentials: false }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => res.json({ ok: true }));

app.use("/api", requireUser);

app.use("/api/workspaces", workspacesRouter);
app.use("/api/repositories", repositoriesRouter);
app.use("/api/assignments", assignmentsRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/repo-files", repoFilesRouter);
app.use("/api/run", runRouter);
app.use("/api/commits", commitsRouter);
app.use("/api/activity", activityRouter);
app.use("/api/branches", branchesRouter);
app.use("/api/pull-requests", pullRequestsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/submissions", submissionsRouter);

// Global error handler — MUST be registered AFTER all routes
app.use(errorHandler);

const port = Number(process.env.PORT || 5000);
const server = app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

// Attach WebSocket handlers
attachTerminalWS(server);
attachYjsWS(server);

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the other server or change PORT in .env.`);
    process.exit(1);
  }
  console.error(err);
  process.exit(1);
});

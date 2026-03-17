import { Router } from "express";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabaseAdmin.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn, execSync } from "node:child_process";

const router = Router();

// ─── Check Docker availability ──────────────────────────────────────
let dockerAvailable = false;
try {
  execSync("docker info", { stdio: "ignore", timeout: 5000 });
  dockerAvailable = true;
} catch { }

function sanitizeFilename(name) {
  const cleaned = name.replace(/\.\./g, "").replace(/[^a-zA-Z0-9._/\-]/g, "");
  if (!cleaned.endsWith(".py") && !cleaned.endsWith(".java")) {
    throw new Error("Entry file must end with .py or .java");
  }
  return cleaned;
}

function runCmd(cmd, args, opts) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, opts);
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.stderr.on("data", (d) => (stderr += d.toString()));
    p.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
    p.on("error", (err) => resolve({ code: 1, stdout, stderr: stderr + err.message }));
  });
}

router.post("/", asyncHandler(async (req, res) => {
  const sb = supabaseAdmin();

  const body = z.object({
    repoId: z.string().uuid(),
    language: z.enum(["python", "java"]),
    entry: z.string().min(1).optional()
  }).parse(req.body);

  const { data: files, error } = await sb
    .from("repo_files")
    .select("path,content")
    .eq("repo_id", body.repoId);

  if (error) return res.status(400).json({ message: error.message });
  if (!files || files.length === 0) return res.status(400).json({ message: "No files found for repo" });

  const dir = await mkdtemp(path.join(tmpdir(), "cc-run-"));
  try {
    for (const f of files) {
      if (f.path.endsWith("/")) continue;
      const abs = path.join(dir, f.path);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, f.content ?? "", "utf8");
    }

    const rawEntry = body.entry ?? (body.language === "python" ? "main.py" : "Main.java");
    const entry = sanitizeFilename(rawEntry);
    const transcriptLines = [];
    let result;

    if (dockerAvailable) {
      // Docker execution
      if (body.language === "python") {
        transcriptLines.push(`$ python ${entry}`);
        result = await runCmd("docker", [
          "run", "--rm",
          "-v", `${dir}:/workspace`,
          "-w", "/workspace",
          "--network", "none",
          "--memory", "256m",
          "--cpus", "1",
          "python:3.11-alpine",
          "python", "-u", entry,
        ]);
      } else {
        const mainClass = path.basename(entry, ".java");
        transcriptLines.push(`$ javac *.java && java ${mainClass}`);
        result = await runCmd("docker", [
          "run", "--rm",
          "-v", `${dir}:/workspace`,
          "-w", "/workspace",
          "--network", "none",
          "--memory", "512m",
          "--cpus", "1",
          "eclipse-temurin:21-jdk",
          "sh", "-c",
          `javac *.java && java ${mainClass}`,
        ]);
      }
    } else {
      // Local fallback
      if (body.language === "python") {
        transcriptLines.push(`$ python ${entry}`);
        result = await runCmd("python", ["-u", entry], { cwd: dir });
      } else {
        const mainClass = path.basename(entry, ".java");
        transcriptLines.push(`$ javac *.java && java ${mainClass}`);
        const cmd = process.platform === "win32"
          ? ["cmd", ["/c", `javac *.java && java ${mainClass}`]]
          : ["sh", ["-c", `javac *.java && java ${mainClass}`]];
        result = await runCmd(cmd[0], cmd[1], { cwd: dir });
      }
    }

    res.json({
      exitCode: result.code,
      transcript: transcriptLines.join("\n") + "\n\n",
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}));

export default router;
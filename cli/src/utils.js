import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const COLLAB_DIR = ".collab";
const CONFIG_FILE = path.join(COLLAB_DIR, "config.json");
const STAGED_FILE = path.join(COLLAB_DIR, "staged.json");
const HEAD_FILE = path.join(COLLAB_DIR, "HEAD");
const LOCAL_COMMITS_FILE = path.join(COLLAB_DIR, "commits.json");

// ─── Config ──────────────────────────────────────────────────────────
export function isInitialized() {
    return fs.existsSync(COLLAB_DIR) && fs.existsSync(CONFIG_FILE);
}

export function readConfig() {
    if (!isInitialized()) throw new Error("Not a CollabSpace project. Run 'collab init' first.");
    return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
}

export function writeConfig(config) {
    if (!fs.existsSync(COLLAB_DIR)) fs.mkdirSync(COLLAB_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

// ─── Staged files ────────────────────────────────────────────────────
export function readStaged() {
    if (!fs.existsSync(STAGED_FILE)) return [];
    return JSON.parse(fs.readFileSync(STAGED_FILE, "utf8"));
}

export function writeStaged(staged) {
    fs.writeFileSync(STAGED_FILE, JSON.stringify(staged, null, 2), "utf8");
}

// ─── HEAD (latest known commit hash) ─────────────────────────────────
export function readHead() {
    if (!fs.existsSync(HEAD_FILE)) return null;
    return fs.readFileSync(HEAD_FILE, "utf8").trim() || null;
}

export function writeHead(hash) {
    fs.writeFileSync(HEAD_FILE, hash, "utf8");
}

// ─── Local commits ───────────────────────────────────────────────────
export function readLocalCommits() {
    if (!fs.existsSync(LOCAL_COMMITS_FILE)) return [];
    return JSON.parse(fs.readFileSync(LOCAL_COMMITS_FILE, "utf8"));
}

export function writeLocalCommits(commits) {
    fs.writeFileSync(LOCAL_COMMITS_FILE, JSON.stringify(commits, null, 2), "utf8");
}

// ─── File scanning ───────────────────────────────────────────────────
const IGNORE_DIRS = new Set([".collab", "node_modules", ".git", "__pycache__", ".venv", "venv", ".idea", ".vscode", ".DS_Store"]);
const IGNORE_EXTS = new Set([".class", ".pyc", ".pyo", ".o", ".exe", ".dll", ".so"]);

export function scanFiles(dir, base = "") {
    const results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const relPath = base ? `${base}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
            if (IGNORE_DIRS.has(entry.name)) continue;
            results.push(...scanFiles(path.join(dir, entry.name), relPath));
        } else {
            const ext = path.extname(entry.name);
            if (IGNORE_EXTS.has(ext)) continue;
            results.push(relPath);
        }
    }
    return results;
}

export function readFileContent(filePath) {
    return fs.readFileSync(filePath, "utf8");
}

// ─── Hashing ─────────────────────────────────────────────────────────
export function sha256(str) {
    return crypto.createHash("sha256").update(str, "utf8").digest("hex");
}

// ─── API fetch ───────────────────────────────────────────────────────
export async function apiFetch(config, endpoint, options = {}) {
    const url = `${config.remote}/api${endpoint}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.token}`,
            ...(options.headers || {}),
        },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `HTTP ${res.status}`);
    }

    if (res.status === 204) return null;
    return res.json();
}

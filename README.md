# CollabSpace

**CollabSpace** is a Next-Generation Developer Collaboration Platform. It functions as a hybrid between GitHub, Google Classroom, and Replit, providing a unified environment for repository management, code execution, real-time collaboration, and classroom assignment tracking.

## 🚀 Features & Updates (Phases 1-3)

CollabSpace has been actively developed in phases. Here is everything we've built so far:

### Core Platform (Phase 1)
- **Workspaces**: Organize projects and people into distinct organizational units.
- **Repositories & File Management**: Web-based file explorer to view, upload, download, and delete files. Auto-rendering of `README.md` files using GitHub-Flavored Markdown.
- **Web IDE & Docker Execution**: Integrated Monaco Editor for writing Python and Java code. Code executes securely in Docker containers (`python:3.11-alpine` and `eclipse-temurin:21-jdk`). An integrated xterm.js terminal displays output and handles STDIN.
- **Activity Feed**: Real-time event logging on the dashboard (repo creations, PRs, commits, assignments).
- **User Scoping & Settings**: Personal dashboard stats, profile management, and appearance settings.

### Version Control Upgrade (Phase 2)
- **Custom Version Control (`collab` CLI)**: A custom-built, Git-like Node.js CLI tool avoids copyright/patent issues while providing a familiar developer experience (`init`, `check`, `add`, `commit`, `log`, `branch`, `checkout`, `push`, `pull`).
- **Branching System**: Full backend and CLI support for creating, switching, and pushing to distinct branches.
- **Pull Requests (PRs)**: A GitHub-style PR system. Browse open/closed PRs, view unified code diffs (with highlighted additions/deletions), leave comments on specific lines, and merge code with automated merge-commits.

### Real-Time & Access Control (Phase 3)
- **Role-Based Access Control (RBAC)**: Workspaces enforce `admin`, `editor`, and `viewer` roles to restrict destructive actions. Admins can manage member roles via a dedicated UI modal.
- **Real-Time Collaboration (Yjs)**: The code editor leverages `yjs`, `y-websocket`, and `y-monaco` to allow multiple users to edit the same file simultaneously. Includes real-time cursor tracking and a "who is online" awareness indicator in the toolbar.
- **Notifications System**: In-app notification bell with unread badges. Users receive alerts when they are added to workspaces, or when PRs are created, commented on, or merged.

---

## 🛠 Tech Stack

**Frontend:**
- React 18 / Next.js
- Tailwind CSS (Styling)
- Lucide React (Icons)
- Framer Motion (Animations)
- Monaco Editor (`@monaco-editor/react`)
- Xterm.js (Terminal emulator)
- React Router DOM
- TanStack Query (Data fetching & caching)
- Yjs & y-monaco (Real-time sync)
- `diff` & `react-markdown` (Code diffs and README rendering)

**Backend:**
- Node.js & Express
- Supabase (PostgreSQL Database, Authentication, Row Level Security)
- Docker (Secure, isolated code execution)
- WebSockets (`ws` and `y-websocket` for terminal output and real-time document sync)
- Zod (Request payload validation)

**CLI Tool:**
- Node.js
- Commander.js (Command parsing)
- Inquirer (Interactive prompts)
- Chalk & Ora (Terminal styling and spinners)

---

## 🗄️ Database Architecture (Supabase PostgreSQL)

The database relies heavily on relational integrity and Row Level Security (RLS) to ensure users only see their organization's data.

**Key Tables:**
- `workspaces`: High-level organizations (requires join codes).
- `workspace_members`: Links users to workspaces, includes RBAC `role` (`admin`, `editor`, `viewer`).
- `repositories`: Code projects belonging to a workspace.
- `repo_files`: The latest state of files in a repository.
- `commits` & `commit_files`: Immutable history of changes (hash, message, branch, author).
- `branches`: Local and remote branch references.
- `pull_requests` & `pr_comments`: Review system data linking source and target branches.
- `assignments` & `submissions`: For the Classroom aspect of the platform.
- `activity_logs`: Audit trail for the dashboard feed.
- `notifications`: User-specific alerts linked to actions.

---

## 💻 CLI Usage Guide

The `collab` CLI tool provides a familiar interface for managing your code locally.

### Setup
1. Open a terminal in your project directory.
2. Login: `collab login`
3. Initialize the repo: `collab init <workspace-id> <repo-name>`
4. Set origin (if cloning): `collab remote add origin <repo-id>`

### Daily Workflow
- **Check Status**: `collab status` (or `collab check`) - View modified/new files.
- **Stage Files**: `collab add .` (or `collab add <file>`)
- **Commit**: `collab commit -m "Your message"`
- **Push**: `collab push origin <branch>`
- **Pull**: `collab pull origin <branch>`

### Branching
- **List Branches**: `collab branch`
- **Create Branch**: `collab branch <new-branch> [source-branch]`
- **Switch Branch**: `collab checkout <branch>`

---

## 🏃‍♂️ How to Run the Project Locally

1. **Start the Backend:**
   Ensure Docker Desktop is running (required for code execution).
   ```bash
   cd backend
   npm run dev
   ```
   *The backend runs on `http://localhost:5000`. It spans both REST API routes and WebSocket servers (on `/ws/terminal` and `/ws/yjs/`).*

2. **Start the Frontend:**
   Open a new terminal.
   ```bash
   npm run dev
   ```
   *The frontend runs usually on `http://localhost:5173`.*

3. **Install the CLI globally (Optional):**
   ```bash
   cd cli
   npm link
   ```
   *You can now type `collab` from any directory on your computer.*

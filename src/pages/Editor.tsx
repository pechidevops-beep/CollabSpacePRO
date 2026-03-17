import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import MonacoEditor, { useMonaco } from "@monaco-editor/react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import { MonacoBinding } from "y-monaco";
import randomcolor from "randomcolor";
import { apiFetch, ApiError } from "@/lib/api";
import { toast } from "@/components/ui/sonner";
import FileExplorer, { buildFileTree, type FileNode } from "@/components/editor/FileExplorer";
import EditorTabs from "@/components/editor/EditorTabs";
import EditorToolbar from "@/components/editor/EditorToolbar";
import Terminal from "@/components/editor/Terminal";
import { ChevronRight, FileCode2, Users } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────
type RepoFile = {
  id: string;
  path: string;
  language: string | null;
  content: string;
  updated_at: string;
};

type FileData = {
  path: string;
  content: string;
  language: string;
  savedContent: string; // content as known by server
};

// ─── Language detection ──────────────────────────────────────────────
function detectLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    py: "python",
    java: "java",
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    html: "html",
    css: "css",
    md: "markdown",
    xml: "xml",
    yaml: "yaml",
    yml: "yaml",
    sh: "shell",
    txt: "plaintext",
  };
  return map[ext] || "plaintext";
}

// ─── Detect primary language of repo ─────────────────────────────────
function detectRepoLanguage(files: FileData[]): string {
  const hasJava = files.some((f) => f.path.endsWith(".java"));
  const hasPython = files.some((f) => f.path.endsWith(".py"));
  if (hasJava) return "java";
  if (hasPython) return "python";
  return "python";
}

// ─── Editor page ─────────────────────────────────────────────────────
const Editor = () => {
  const repoId = useMemo(() => localStorage.getItem("activeRepoId"), []);
  const repoName = useMemo(() => localStorage.getItem("activeRepoName") || "Project", []);

  // File data
  const [files, setFiles] = useState<FileData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Open tabs & active file
  const [openTabs, setOpenTabs] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  // Sidebar
  const [showSidebar, setShowSidebar] = useState(true);

  // Terminal
  const [showTerminal, setShowTerminal] = useState(true);
  const [runTrigger, setRunTrigger] = useState(0);

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Yjs & Monaco
  const editorRef = useRef<any>(null);
  const [awarenessUsers, setAwarenessUsers] = useState<any[]>([]);
  const yjsWsUrl = useMemo(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL as string;
    return apiBase.replace(/^http/, "ws").replace(/\/api$/, "/ws/yjs/");
  }, []);

  // ─── Load files from DB ────────────────────────────────────────────
  useEffect(() => {
    if (!repoId) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const remote = await apiFetch<RepoFile[]>(`/repo-files?repoId=${repoId}`);
        if (cancelled) return;

        if (remote.length === 0) {
          // Create default files
          const defaults: FileData[] = [
            {
              path: "Main.java",
              language: "java",
              content: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from CollabSpace!");\n    }\n}\n',
              savedContent: "",
            },
            {
              path: "main.py",
              language: "python",
              content: 'print("Hello from CollabSpace!")\n',
              savedContent: "",
            },
          ];
          setFiles(defaults);
          setOpenTabs(["Main.java"]);
          setActiveFile("Main.java");

          // Persist defaults
          for (const f of defaults) {
            await apiFetch("/repo-files", {
              method: "POST",
              body: JSON.stringify({ repoId, path: f.path, language: f.language, content: f.content }),
            });
          }
          // Update savedContent
          setFiles((prev) => prev.map((f) => ({ ...f, savedContent: f.content })));
        } else {
          const mapped: FileData[] = remote.map((f) => ({
            path: f.path,
            language: f.language || detectLanguage(f.path),
            content: f.content ?? "",
            savedContent: f.content ?? "",
          }));
          setFiles(mapped);

          // Open first non-folder file
          const firstFile = mapped.find((f) => !f.path.endsWith("/"));
          if (firstFile) {
            setOpenTabs([firstFile.path]);
            setActiveFile(firstFile.path);
          }
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load repo files");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [repoId]);

  // ─── Get current file data ─────────────────────────────────────────
  const currentFile = useMemo(
    () => files.find((f) => f.path === activeFile),
    [files, activeFile]
  );

  // ─── Build file tree ───────────────────────────────────────────────
  const fileTree = useMemo(
    () => buildFileTree(files.map((f) => f.path)),
    [files]
  );

  // ─── File selection ────────────────────────────────────────────────
  const handleFileSelect = useCallback((path: string) => {
    // Don't open folders
    if (path.endsWith("/")) return;

    setActiveFile(path);
    setOpenTabs((prev) => (prev.includes(path) ? prev : [...prev, path]));
  }, []);

  // ─── Tab management ────────────────────────────────────────────────
  const handleTabClose = useCallback((path: string) => {
    setOpenTabs((prev) => {
      const next = prev.filter((p) => p !== path);
      if (activeFile === path) {
        setActiveFile(next.length > 0 ? next[next.length - 1] : null);
      }
      return next;
    });
  }, [activeFile]);

  // ─── Editor content change (Local fallback if Yjs not used, but Yjs takes over mostly) ───
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      // With Yjs, we rely on the Y.Text observer for content updates to state.
      // But if we need manual override, it's here.
    },
    []
  );

  // ─── Yjs Integration ───────────────────────────────────────────────
  useEffect(() => {
    if (!repoId || !activeFile || !editorRef.current) return;

    let destroyed = false;
    const roomName = `${repoId}:${activeFile.replace(/\//g, "-")}`;

    const yDoc = new Y.Doc();
    const yText = yDoc.getText("monaco");
    const wsProvider = new WebsocketProvider(yjsWsUrl, roomName, yDoc);

    // User awareness
    const userEmail = localStorage.getItem("userEmail") || "Anonymous";
    const userName = userEmail.split("@")[0];
    const userColor = randomcolor({ luminosity: "dark" });

    wsProvider.awareness.setLocalStateField("user", {
      name: userName,
      color: userColor,
    });

    wsProvider.awareness.on("change", () => {
      if (!destroyed) {
        // Get unique users by name
        const states = Array.from(wsProvider.awareness.getStates().values());
        const unique = Array.from(new Map(states.filter(s => s.user).map(s => [s.user.name, s.user])).values());
        setAwarenessUsers(unique);
      }
    });

    const mBinding = new MonacoBinding(
      yText,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      wsProvider.awareness
    );

    // Initial content sync
    const fileData = files.find(f => f.path === activeFile);
    wsProvider.on("sync", (isSynced: boolean) => {
      if (isSynced && yText.toString() === "" && fileData && fileData.content) {
        yText.insert(0, fileData.content);
      }
    });

    // Auto-save on remote/local changes
    yText.observe(() => {
      if (destroyed) return;
      const newContent = yText.toString();

      setFiles((prev) =>
        prev.map((f) => (f.path === activeFile ? { ...f, content: newContent } : f))
      );

      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        saveFile(activeFile, newContent);
      }, 1500);
    });

    return () => {
      destroyed = true;
      mBinding.destroy();
      wsProvider.disconnect();
      wsProvider.destroy();
      yDoc.destroy();
      setAwarenessUsers([]);
    };
  }, [repoId, activeFile, yjsWsUrl]);

  // ─── Save file ─────────────────────────────────────────────────────
  const saveFile = useCallback(
    async (path: string, content?: string) => {
      if (!repoId) return;
      const fileData = files.find((f) => f.path === path);
      if (!fileData) return;
      const body = content ?? fileData.content;

      setIsSaving(true);
      try {
        await apiFetch("/repo-files", {
          method: "PUT",
          body: JSON.stringify({
            repoId,
            path,
            language: fileData.language,
            content: body,
          }),
        });
        // Update savedContent
        setFiles((prev) =>
          prev.map((f) => (f.path === path ? { ...f, savedContent: body, content: body } : f))
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Save failed");
      } finally {
        setIsSaving(false);
      }
    },
    [repoId, files]
  );

  // ─── Save active file ─────────────────────────────────────────────
  const handleSave = useCallback(() => {
    if (activeFile) saveFile(activeFile);
  }, [activeFile, saveFile]);

  // ─── Run code ──────────────────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (!repoId) return;

    // Save all modified files first
    setIsRunning(true);
    try {
      const modified = files.filter((f) => f.content !== f.savedContent && !f.path.endsWith("/"));
      for (const f of modified) {
        await apiFetch("/repo-files", {
          method: "PUT",
          body: JSON.stringify({ repoId, path: f.path, language: f.language, content: f.content }),
        });
      }
      setFiles((prev) =>
        prev.map((f) => modified.find((m) => m.path === f.path) ? { ...f, savedContent: f.content } : f)
      );
    } catch (e) {
      toast.error("Failed to save files before run");
    }

    setShowTerminal(true);
    setRunTrigger((prev) => prev + 1);
    setIsRunning(false);
  }, [repoId, files]);

  // ─── Ctrl+S save + Ctrl+Enter run shortcuts ──────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
        // Format on save
        if (editorRef.current) {
          editorRef.current.getAction?.('editor.action.formatDocument')?.run();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave, handleRun]);

  // ─── File CRUD ─────────────────────────────────────────────────────
  const handleCreateFile = useCallback(
    async (parentPath: string, name: string) => {
      if (!repoId) return;
      const fullPath = parentPath ? `${parentPath}${name}` : name;
      const lang = detectLanguage(name);

      try {
        await apiFetch("/repo-files", {
          method: "POST",
          body: JSON.stringify({ repoId, path: fullPath, language: lang, content: "", isFolder: false }),
        });
        const newFile: FileData = { path: fullPath, content: "", language: lang, savedContent: "" };
        setFiles((prev) => [...prev, newFile]);
        handleFileSelect(fullPath);
        toast.success(`Created ${name}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Create failed");
      }
    },
    [repoId, handleFileSelect]
  );

  const handleCreateFolder = useCallback(
    async (parentPath: string, name: string) => {
      if (!repoId) return;
      const fullPath = parentPath ? `${parentPath}${name}/` : `${name}/`;

      try {
        await apiFetch("/repo-files", {
          method: "POST",
          body: JSON.stringify({ repoId, path: fullPath, isFolder: true }),
        });
        setFiles((prev) => [...prev, { path: fullPath, content: "", language: "", savedContent: "" }]);
        toast.success(`Created folder ${name}`);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Create failed");
      }
    },
    [repoId]
  );

  const handleDelete = useCallback(
    async (path: string) => {
      if (!repoId) return;

      try {
        await apiFetch("/repo-files", {
          method: "DELETE",
          body: JSON.stringify({ repoId, path }),
        });

        setFiles((prev) => prev.filter((f) => !f.path.startsWith(path)));
        setOpenTabs((prev) => prev.filter((p) => !p.startsWith(path)));
        if (activeFile?.startsWith(path)) {
          setActiveFile(null);
        }
        toast.success("Deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Delete failed");
      }
    },
    [repoId, activeFile]
  );

  const handleRename = useCallback(
    async (oldPath: string, newPath: string) => {
      if (!repoId || oldPath === newPath) return;

      try {
        await apiFetch("/repo-files", {
          method: "PATCH",
          body: JSON.stringify({ repoId, oldPath, newPath }),
        });

        setFiles((prev) =>
          prev.map((f) => {
            if (f.path === oldPath) return { ...f, path: newPath };
            if (oldPath.endsWith("/") && f.path.startsWith(oldPath)) {
              return { ...f, path: newPath + f.path.slice(oldPath.length) };
            }
            return f;
          })
        );
        setOpenTabs((prev) => prev.map((p) => (p === oldPath ? newPath : p)));
        if (activeFile === oldPath) setActiveFile(newPath);
        toast.success("Renamed");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Rename failed");
      }
    },
    [repoId, activeFile]
  );

  // ─── Folder upload ─────────────────────────────────────────────────
  const handleFolderUpload = useCallback(
    async (fileList: FileList) => {
      if (!repoId) return;
      const entries = Array.from(fileList);
      if (entries.length === 0) return;

      let created = 0;
      for (const file of entries) {
        const relativePath = (file as any).webkitRelativePath || file.name;
        if (relativePath.includes('/.') || relativePath.includes('__pycache__') || relativePath.includes('node_modules')) continue;

        const content = await file.text();
        const lang = detectLanguage(relativePath);

        try {
          await apiFetch("/repo-files", {
            method: "POST",
            body: JSON.stringify({ repoId, path: relativePath, language: lang, content, isFolder: false }),
          });
          created++;
        } catch {
          try {
            await apiFetch("/repo-files", {
              method: "PUT",
              body: JSON.stringify({ repoId, path: relativePath, language: lang, content }),
            });
            created++;
          } catch {}
        }
      }

      // Reload files
      try {
        const remote = await apiFetch<RepoFile[]>(`/repo-files?repoId=${repoId}`);
        const mapped: FileData[] = remote.map((f) => ({
          path: f.path,
          language: f.language || detectLanguage(f.path),
          content: f.content ?? "",
          savedContent: f.content ?? "",
        }));
        setFiles(mapped);
        toast.success(`Uploaded ${created} files`);
      } catch {
        toast.success(`Uploaded ${created} files (refresh to see all)`);
      }
    },
    [repoId]
  );

  // ─── Tab data ──────────────────────────────────────────────────────
  const tabData = useMemo(
    () =>
      openTabs.map((path) => {
        const f = files.find((file) => file.path === path);
        return {
          path,
          name: path.split("/").pop() || path,
          modified: f ? f.content !== f.savedContent : false,
        };
      }),
    [openTabs, files]
  );

  const repoLanguage = useMemo(() => detectRepoLanguage(files), [files]);

  const wsBaseUrl = useMemo(() => {
    const apiBase = import.meta.env.VITE_API_BASE_URL as string;
    // Convert http://localhost:5000/api → ws://localhost:5000/ws/terminal
    return apiBase.replace(/^http/, "ws").replace(/\/api$/, "/ws/terminal");
  }, []);

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[#0d1117] dark">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border pr-4 bg-card/60">
        <EditorToolbar
          repoName={repoName}
          isSaving={isSaving}
          isRunning={isRunning}
          isLoading={isLoading}
          hasRepo={!!repoId}
          onSave={handleSave}
          onRun={handleRun}
          onFolderUpload={handleFolderUpload}
        />

        {/* Awareness indicator */}
        <div className="flex items-center gap-2">
          {awarenessUsers.length > 1 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/50 border border-border">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex -space-x-1.5">
                {awarenessUsers.map((u, i) => (
                  <div
                    key={i}
                    title={u.name}
                    className="h-5 w-5 rounded-full border border-background flex items-center justify-center text-[9px] text-white font-bold uppercase shadow-sm"
                    style={{ backgroundColor: u.color }}
                  >
                    {u.name.charAt(0)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar toggle + File Explorer */}
        <div className="flex">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="w-11 shrink-0 border-r border-border bg-card/30 flex items-start pt-3 justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${showSidebar ? "rotate-180" : ""}`} />
          </button>

          {showSidebar && (
            <div className="w-56 border-r border-border bg-card/30 overflow-hidden">
              <FileExplorer
                files={fileTree}
                activeFile={activeFile}
                onFileSelect={handleFileSelect}
                onCreateFile={handleCreateFile}
                onCreateFolder={handleCreateFolder}
                onDelete={handleDelete}
                onRename={handleRename}
              />
            </div>
          )}
        </div>

        {/* Main area — editor + terminal */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <EditorTabs
            tabs={tabData}
            activeTab={activeFile}
            onTabSelect={(p) => setActiveFile(p)}
            onTabClose={handleTabClose}
          />

          {/* Editor */}
          <div className="flex-1 min-h-0">
            {currentFile ? (
              <MonacoEditor
                height="100%"
                language={currentFile.language || "plaintext"}
                theme="vs-dark"
                onMount={(editor) => {
                  editorRef.current = editor;
                  // If we already have the content (e.g. before Yjs syncs or Yjs is offline), set a default safely.
                  // Yjs MonacoBinding will override this instantly if it has data.
                  if (currentFile.content) {
                    editor.setValue(currentFile.content);
                  }
                }}
                onChange={handleEditorChange}
                options={{
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  minimap: { enabled: false },
                  padding: { top: 12 },
                  lineNumbers: "on",
                  renderWhitespace: "selection",
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  bracketPairColorization: { enabled: true },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 4,
                  wordWrap: "off",
                }}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center space-y-2">
                  <FileCode2 className="h-12 w-12 mx-auto opacity-20" />
                  <p className="text-sm">Select a file to edit</p>
                </div>
              </div>
            )}
          </div>

          {/* Terminal Panel — always MOUNTED (WebSocket must stay alive),
               visibility controlled by showTerminal */}
          {repoId && (
            <>
              {/* The terminal itself — always rendered, never unmounted */}
              <div
                className="border-t border-border shrink-0"
                style={{ height: showTerminal ? "208px" : "0px", overflow: "hidden", transition: "height 0.2s" }}
              >
                <Terminal
                  repoId={repoId}
                  language={repoLanguage}
                  wsBaseUrl={wsBaseUrl}
                  runTrigger={runTrigger}
                  entryFile={activeFile?.endsWith(".java") ? activeFile : undefined}
                />
              </div>
              {/* Tab to open terminal */}
              {!showTerminal && (
                <button
                  onClick={() => setShowTerminal(true)}
                  className="w-full h-6 border-t border-border bg-card/30 flex items-center justify-center text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ▲ Terminal
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Editor;

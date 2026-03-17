import { useState, useRef, useCallback } from "react";
import {
    ChevronRight,
    FileCode2,
    Folder,
    FolderOpen,
    Plus,
    FilePlus,
    FolderPlus,
    Trash2,
    Pencil,
    MoreHorizontal,
} from "lucide-react";

export type FileNode = {
    path: string;
    name: string;
    isFolder: boolean;
    children?: FileNode[];
};

type Props = {
    files: FileNode[];
    activeFile: string | null;
    onFileSelect: (path: string) => void;
    onCreateFile: (parentPath: string, name: string) => void;
    onCreateFolder: (parentPath: string, name: string) => void;
    onDelete: (path: string) => void;
    onRename: (oldPath: string, newPath: string) => void;
};

// ─── Language-based file icon colors ─────────────────────────────────
function getFileColor(name: string): string {
    if (name.endsWith(".java")) return "text-orange-400";
    if (name.endsWith(".py")) return "text-yellow-400";
    if (name.endsWith(".ts") || name.endsWith(".tsx")) return "text-blue-400";
    if (name.endsWith(".js") || name.endsWith(".jsx")) return "text-yellow-300";
    if (name.endsWith(".json")) return "text-green-400";
    if (name.endsWith(".css")) return "text-purple-400";
    if (name.endsWith(".html")) return "text-red-400";
    if (name.endsWith(".md")) return "text-gray-400";
    return "text-muted-foreground";
}

// ─── Build tree from flat file list ──────────────────────────────────
export function buildFileTree(paths: string[]): FileNode[] {
    const root: FileNode[] = [];

    for (const p of paths) {
        const parts = p.replace(/\/$/, "").split("/");
        let current = root;

        for (let i = 0; i < parts.length; i++) {
            const name = parts[i];
            const isLast = i === parts.length - 1;
            const isFolder = !isLast || p.endsWith("/");
            const fullPath = parts.slice(0, i + 1).join("/") + (isFolder ? "/" : "");

            let node = current.find((n) => n.name === name);
            if (!node) {
                node = { path: fullPath, name, isFolder, children: isFolder ? [] : undefined };
                current.push(node);
            }
            if (node.children) {
                current = node.children;
            }
        }
    }

    // Sort: folders first, then files alphabetically
    const sortNodes = (nodes: FileNode[]) => {
        nodes.sort((a, b) => {
            if (a.isFolder && !b.isFolder) return -1;
            if (!a.isFolder && b.isFolder) return 1;
            return a.name.localeCompare(b.name);
        });
        nodes.forEach((n) => n.children && sortNodes(n.children));
    };
    sortNodes(root);
    return root;
}

export default function FileExplorer({
    files,
    activeFile,
    onFileSelect,
    onCreateFile,
    onCreateFolder,
    onDelete,
    onRename,
}: Props) {
    const [expanded, setExpanded] = useState<Set<string>>(new Set([""]));
    const [creating, setCreating] = useState<{ parent: string; type: "file" | "folder" } | null>(null);
    const [renaming, setRenaming] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; path: string; isFolder: boolean } | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const toggleFolder = (path: string) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            next.has(path) ? next.delete(path) : next.add(path);
            return next;
        });
    };

    const handleContextMenu = useCallback((e: React.MouseEvent, path: string, isFolder: boolean) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, path, isFolder });
    }, []);

    const closeContextMenu = () => setContextMenu(null);

    const startCreate = (parent: string, type: "file" | "folder") => {
        setCreating({ parent, type });
        setContextMenu(null);
        // Ensure parent folder is expanded
        setExpanded((prev) => new Set([...prev, parent]));
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const finishCreate = (value: string) => {
        if (!creating || !value.trim()) {
            setCreating(null);
            return;
        }
        if (creating.type === "file") {
            onCreateFile(creating.parent, value.trim());
        } else {
            onCreateFolder(creating.parent, value.trim());
        }
        setCreating(null);
    };

    const startRename = (path: string) => {
        setRenaming(path);
        setContextMenu(null);
        setTimeout(() => inputRef.current?.focus(), 50);
    };

    const finishRename = (newName: string) => {
        if (!renaming || !newName.trim()) {
            setRenaming(null);
            return;
        }
        const parts = renaming.replace(/\/$/, "").split("/");
        parts[parts.length - 1] = newName.trim();
        const isFolder = renaming.endsWith("/");
        const newPath = parts.join("/") + (isFolder ? "/" : "");
        onRename(renaming, newPath);
        setRenaming(null);
    };

    const handleDelete = (path: string) => {
        setContextMenu(null);
        onDelete(path);
    };

    // ─── Recursive node renderer ───────────────────────────────────────
    const renderNode = (node: FileNode, depth: number) => {
        const isActive = node.path === activeFile;
        const isExpanded = expanded.has(node.path);
        const isRenaming = renaming === node.path;

        return (
            <div key={node.path}>
                <button
                    className={`w-full flex items-center gap-1.5 px-2 py-1 text-xs transition-colors group ${isActive
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                        }`}
                    style={{ paddingLeft: `${depth * 12 + 8}px` }}
                    onClick={() => {
                        if (node.isFolder) {
                            toggleFolder(node.path);
                        } else {
                            onFileSelect(node.path);
                        }
                    }}
                    onContextMenu={(e) => handleContextMenu(e, node.path, node.isFolder)}
                >
                    {node.isFolder ? (
                        <>
                            <ChevronRight
                                className={`h-3 w-3 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                            />
                            {isExpanded ? (
                                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-yellow-400" />
                            ) : (
                                <Folder className="h-3.5 w-3.5 shrink-0 text-yellow-400/70" />
                            )}
                        </>
                    ) : (
                        <>
                            <span className="w-3" />
                            <FileCode2 className={`h-3.5 w-3.5 shrink-0 ${getFileColor(node.name)}`} />
                        </>
                    )}

                    {isRenaming ? (
                        <input
                            ref={inputRef}
                            className="flex-1 bg-secondary border border-primary/50 rounded px-1 py-0.5 text-xs text-foreground outline-none"
                            defaultValue={node.name}
                            onBlur={(e) => finishRename(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") finishRename((e.target as HTMLInputElement).value);
                                if (e.key === "Escape") setRenaming(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="truncate">{node.name}</span>
                    )}
                </button>

                {/* Children (if folder and expanded) */}
                {node.isFolder && isExpanded && (
                    <div>
                        {(node.children ?? []).map((child) => renderNode(child, depth + 1))}
                        {/* Inline input for creating new items */}
                        {creating && creating.parent === node.path && (
                            <div className="flex items-center gap-1.5 px-2 py-1" style={{ paddingLeft: `${(depth + 1) * 12 + 8}px` }}>
                                {creating.type === "folder" ? (
                                    <Folder className="h-3.5 w-3.5 text-yellow-400/70 shrink-0" />
                                ) : (
                                    <FileCode2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                )}
                                <input
                                    ref={inputRef}
                                    className="flex-1 bg-secondary border border-primary/50 rounded px-1 py-0.5 text-xs text-foreground outline-none"
                                    placeholder={creating.type === "folder" ? "folder name" : "filename.ext"}
                                    onBlur={(e) => finishCreate(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") finishCreate((e.target as HTMLInputElement).value);
                                        if (e.key === "Escape") setCreating(null);
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col" onClick={closeContextMenu}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Explorer
                </span>
                <div className="flex items-center gap-1">
                    <button
                        className="p-0.5 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                        title="New File"
                        onClick={() => startCreate("", "file")}
                    >
                        <FilePlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                        className="p-0.5 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
                        title="New Folder"
                        onClick={() => startCreate("", "folder")}
                    >
                        <FolderPlus className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* File tree */}
            <div className="flex-1 overflow-y-auto py-1">
                {files.map((node) => renderNode(node, 0))}

                {/* Root-level creation input */}
                {creating && creating.parent === "" && (
                    <div className="flex items-center gap-1.5 px-2 py-1">
                        {creating.type === "folder" ? (
                            <Folder className="h-3.5 w-3.5 text-yellow-400/70 shrink-0" />
                        ) : (
                            <FileCode2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        )}
                        <input
                            ref={inputRef}
                            className="flex-1 bg-secondary border border-primary/50 rounded px-1 py-0.5 text-xs text-foreground outline-none"
                            placeholder={creating.type === "folder" ? "folder name" : "filename.ext"}
                            onBlur={(e) => finishCreate(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") finishCreate((e.target as HTMLInputElement).value);
                                if (e.key === "Escape") setCreating(null);
                            }}
                        />
                    </div>
                )}
            </div>

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="fixed z-50 min-w-[140px] rounded-lg border border-border bg-card shadow-lg py-1"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {contextMenu.isFolder && (
                        <>
                            <button
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-secondary/80 transition-colors"
                                onClick={() => startCreate(contextMenu.path, "file")}
                            >
                                <FilePlus className="h-3 w-3" /> New File
                            </button>
                            <button
                                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-secondary/80 transition-colors"
                                onClick={() => startCreate(contextMenu.path, "folder")}
                            >
                                <FolderPlus className="h-3 w-3" /> New Folder
                            </button>
                            <div className="h-px bg-border my-1" />
                        </>
                    )}
                    <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-secondary/80 transition-colors"
                        onClick={() => startRename(contextMenu.path)}
                    >
                        <Pencil className="h-3 w-3" /> Rename
                    </button>
                    <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                        onClick={() => handleDelete(contextMenu.path)}
                    >
                        <Trash2 className="h-3 w-3" /> Delete
                    </button>
                </div>
            )}
        </div>
    );
}

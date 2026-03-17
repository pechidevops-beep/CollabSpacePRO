import { useMemo } from "react";
import * as Diff from "diff";

type DiffViewerProps = {
    oldContent: string;
    newContent: string;
    oldTitle?: string;
    newTitle?: string;
};

type DiffLine = {
    type: "add" | "remove" | "context";
    content: string;
    oldLine?: number;
    newLine?: number;
};

export default function DiffViewer({ oldContent, newContent, oldTitle = "Before", newTitle = "After" }: DiffViewerProps) {
    const lines = useMemo(() => {
        const changes = Diff.diffLines(oldContent, newContent);
        const result: DiffLine[] = [];
        let oldLine = 1;
        let newLine = 1;

        for (const change of changes) {
            const content = change.value.replace(/\n$/, "");
            const lineTexts = content.split("\n");

            for (const text of lineTexts) {
                if (change.added) {
                    result.push({ type: "add", content: text, newLine: newLine++ });
                } else if (change.removed) {
                    result.push({ type: "remove", content: text, oldLine: oldLine++ });
                } else {
                    result.push({ type: "context", content: text, oldLine: oldLine++, newLine: newLine++ });
                }
            }
        }
        return result;
    }, [oldContent, newContent]);

    const stats = useMemo(() => {
        const added = lines.filter((l) => l.type === "add").length;
        const removed = lines.filter((l) => l.type === "remove").length;
        return { added, removed };
    }, [lines]);

    return (
        <div className="rounded-lg border border-border overflow-hidden text-xs font-mono">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-secondary/30 border-b border-border">
                <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">{oldTitle} → {newTitle}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-emerald-400">+{stats.added}</span>
                    <span className="text-red-400">-{stats.removed}</span>
                </div>
            </div>

            {/* Diff lines */}
            <div className="overflow-x-auto">
                {lines.map((line, i) => (
                    <div
                        key={i}
                        className={`flex ${line.type === "add"
                                ? "bg-emerald-500/10"
                                : line.type === "remove"
                                    ? "bg-red-500/10"
                                    : ""
                            }`}
                    >
                        {/* Old line number */}
                        <span className="w-10 shrink-0 text-right pr-2 py-0.5 text-muted-foreground/50 select-none border-r border-border/50">
                            {line.type !== "add" ? line.oldLine : ""}
                        </span>
                        {/* New line number */}
                        <span className="w-10 shrink-0 text-right pr-2 py-0.5 text-muted-foreground/50 select-none border-r border-border/50">
                            {line.type !== "remove" ? line.newLine : ""}
                        </span>
                        {/* Diff indicator */}
                        <span className={`w-5 shrink-0 text-center py-0.5 select-none ${line.type === "add" ? "text-emerald-400" : line.type === "remove" ? "text-red-400" : "text-muted-foreground/30"
                            }`}>
                            {line.type === "add" ? "+" : line.type === "remove" ? "−" : " "}
                        </span>
                        {/* Content */}
                        <span className={`flex-1 py-0.5 pl-1 whitespace-pre ${line.type === "add" ? "text-emerald-300" : line.type === "remove" ? "text-red-300" : "text-foreground"
                            }`}>
                            {line.content}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

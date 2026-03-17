import { FileCode2, X } from "lucide-react";

type Tab = {
    path: string;
    name: string;
    modified: boolean;
};

type Props = {
    tabs: Tab[];
    activeTab: string | null;
    onTabSelect: (path: string) => void;
    onTabClose: (path: string) => void;
};

function getFileColor(name: string): string {
    if (name.endsWith(".java")) return "text-orange-400";
    if (name.endsWith(".py")) return "text-yellow-400";
    if (name.endsWith(".ts") || name.endsWith(".tsx")) return "text-blue-400";
    if (name.endsWith(".js") || name.endsWith(".jsx")) return "text-yellow-300";
    if (name.endsWith(".json")) return "text-green-400";
    if (name.endsWith(".css")) return "text-purple-400";
    if (name.endsWith(".html")) return "text-red-400";
    return "text-muted-foreground";
}

export default function EditorTabs({ tabs, activeTab, onTabSelect, onTabClose }: Props) {
    if (tabs.length === 0) return null;

    return (
        <div className="flex items-center bg-card/30 border-b border-border overflow-x-auto scrollbar-none">
            {tabs.map((tab) => {
                const isActive = tab.path === activeTab;
                return (
                    // Use div not button to avoid nested-button HTML violation
                    <div
                        key={tab.path}
                        role="tab"
                        aria-selected={isActive}
                        tabIndex={0}
                        className={`group flex items-center gap-1.5 px-3 py-2 text-xs border-r border-border transition-colors shrink-0 cursor-pointer select-none ${
                            isActive
                                ? "bg-background text-foreground border-b-2 border-b-primary"
                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/30"
                        }`}
                        onClick={() => onTabSelect(tab.path)}
                        onKeyDown={(e) => e.key === "Enter" && onTabSelect(tab.path)}
                    >
                        <FileCode2 className={`h-3 w-3 shrink-0 ${getFileColor(tab.name)}`} />
                        <span>{tab.name}</span>
                        {tab.modified && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary ml-0.5 shrink-0" title="Unsaved changes" />
                        )}
                        <button
                            type="button"
                            className="ml-1 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary transition-all"
                            onClick={(e) => {
                                e.stopPropagation();
                                onTabClose(tab.path);
                            }}
                        >
                            <X className="h-2.5 w-2.5" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}


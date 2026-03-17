import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, FolderGit2, Save, Play, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
    repoName: string;
    isSaving: boolean;
    isRunning: boolean;
    isLoading: boolean;
    hasRepo: boolean;
    onSave: () => void;
    onRun: () => void;
    onFolderUpload?: (files: FileList) => void;
};

export default function EditorToolbar({
    repoName,
    isSaving,
    isRunning,
    isLoading,
    hasRepo,
    onSave,
    onRun,
    onFolderUpload,
}: Props) {
    const folderInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="h-11 flex items-center justify-between border-b border-border px-3 bg-card/80 backdrop-blur-sm shrink-0">
            <div className="flex items-center gap-2">
                <Link to="/repositories">
                    <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-7">
                        <ChevronLeft className="h-3 w-3" /> Back
                    </Button>
                </Link>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-1.5">
                    <FolderGit2 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-sm font-mono font-medium text-foreground">{repoName}</span>
                </div>
            </div>
            <div className="flex items-center gap-1.5">
                {/* Upload folder */}
                {onFolderUpload && (
                    <>
                        <input
                            ref={folderInputRef}
                            type="file"
                            className="hidden"
                            {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                            onChange={(e) => {
                                if (e.target.files && e.target.files.length > 0) {
                                    onFolderUpload(e.target.files);
                                }
                                e.target.value = "";
                            }}
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1.5 text-xs h-7"
                            onClick={() => folderInputRef.current?.click()}
                            disabled={isLoading || !hasRepo}
                        >
                            <Upload className="h-3 w-3" /> Upload
                        </Button>
                    </>
                )}
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs h-7"
                    onClick={onSave}
                    disabled={isSaving || isLoading || !hasRepo}
                    title="Ctrl+S"
                >
                    <Save className="h-3 w-3" /> {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                    size="sm"
                    className="gap-1.5 text-xs h-7 bg-emerald-600 hover:bg-emerald-500 text-white"
                    onClick={onRun}
                    disabled={isRunning || isLoading || !hasRepo}
                    title="Ctrl+Enter"
                >
                    <Play className="h-3 w-3" /> {isRunning ? "Running..." : "Run"}
                </Button>
            </div>
        </div>
    );
}

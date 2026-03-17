import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Bell, Check, CheckCheck, GitPullRequest, GitMerge,
    MessageSquare, X, Clock, FolderGit2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useNavigate } from "react-router-dom";

type Notification = {
    id: string;
    type: string;
    title: string;
    body: string;
    link: string;
    read: boolean;
    actor_email: string;
    created_at: string;
};

const typeIcons: Record<string, typeof Bell> = {
    pr_created: GitPullRequest,
    pr_merged: GitMerge,
    pr_comment: MessageSquare,
    repo_created: FolderGit2,
};

function timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
}

export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const qc = useQueryClient();

    // Close on click outside
    useEffect(() => {
        const handle = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, []);

    const { data: countData } = useQuery({
        queryKey: ["notifications", "count"],
        queryFn: () => apiFetch<{ unread: number }>("/notifications/count"),
        refetchInterval: 15000,
    });

    const { data: notifications = [] } = useQuery({
        queryKey: ["notifications", "list"],
        queryFn: () => apiFetch<Notification[]>("/notifications?limit=20"),
        enabled: open,
        refetchInterval: open ? 10000 : false,
    });

    const markRead = useMutation({
        mutationFn: (id: string) => apiFetch(`/notifications/${id}/read`, { method: "PATCH" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const markAllRead = useMutation({
        mutationFn: () => apiFetch("/notifications/read-all", { method: "PATCH" }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["notifications"] });
        },
    });

    const unread = countData?.unread ?? 0;

    return (
        <div ref={ref} className="relative">
            {/* Bell button */}
            <button
                onClick={() => setOpen(!open)}
                className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
            >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                    <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 h-4.5 min-w-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold"
                    >
                        {unread > 99 ? "99+" : unread}
                    </motion.span>
                )}
            </button>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-10 w-96 max-h-[70vh] rounded-xl border border-border bg-card shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
                            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {unread > 0 && (
                                    <button
                                        onClick={() => markAllRead.mutate()}
                                        className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1"
                                    >
                                        <CheckCheck className="h-3 w-3" /> Mark all read
                                    </button>
                                )}
                                <button onClick={() => setOpen(false)} className="p-0.5 rounded hover:bg-secondary text-muted-foreground">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* List */}
                        <div className="overflow-y-auto flex-1">
                            {notifications.length === 0 ? (
                                <div className="py-12 text-center text-sm text-muted-foreground">
                                    <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    No notifications yet
                                </div>
                            ) : (
                                notifications.map((n) => {
                                    const Icon = typeIcons[n.type] || Bell;
                                    return (
                                        <div
                                            key={n.id}
                                            className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors cursor-pointer border-b border-border/30 ${!n.read ? "bg-primary/5" : ""}`}
                                            onClick={() => {
                                                if (!n.read) markRead.mutate(n.id);
                                                if (n.link) navigate(n.link);
                                                setOpen(false);
                                            }}
                                        >
                                            <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${!n.read ? "bg-primary/15" : "bg-secondary/60"}`}>
                                                <Icon className={`h-3.5 w-3.5 ${!n.read ? "text-primary" : "text-muted-foreground"}`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs leading-snug ${!n.read ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                                    {n.title}
                                                </p>
                                                {n.body && (
                                                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{n.body}</p>
                                                )}
                                                <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                                                    <Clock className="h-2.5 w-2.5" /> {timeAgo(n.created_at)}
                                                </p>
                                            </div>
                                            {!n.read && (
                                                <span className="mt-2 h-2 w-2 rounded-full bg-primary shrink-0" />
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

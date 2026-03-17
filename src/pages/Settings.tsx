import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    User, Mail, Key, Bell, Shield, Palette, Monitor, Moon, Sun,
    Save, Eye, EyeOff, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/components/ui/sonner";

const Settings = () => {
    const [user, setUser] = useState<{ id: string; email: string; name: string } | null>(null);
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [fullName, setFullName] = useState("");
    const [saving, setSaving] = useState(false);
    const [theme, setTheme] = useState<"dark" | "light" | "system">("dark");

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                const name = data.user.user_metadata?.full_name || data.user.email?.split("@")[0] || "";
                setUser({
                    id: data.user.id,
                    email: data.user.email ?? "",
                    name,
                });
                setFullName(name);
            }
        });
    }, []);

    const handleUpdateProfile = async () => {
        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                data: { full_name: fullName },
            });
            if (error) throw error;
            toast.success("Profile updated");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Update failed");
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast.error("Passwords don't match");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setSaving(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword,
            });
            if (error) throw error;
            toast.success("Password changed successfully");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Password change failed");
        } finally {
            setSaving(false);
        }
    };

    const card = "rounded-xl border border-border bg-card p-6 shadow-card";
    const inputCls = "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors";

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences.</p>
            </div>

            {/* Profile Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 }}
                className={card}
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Profile</h2>
                        <p className="text-xs text-muted-foreground">Your personal information</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <User className="h-3 w-3" /> Display Name
                        </label>
                        <input
                            className={inputCls}
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your name"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <Mail className="h-3 w-3" /> Email
                        </label>
                        <input
                            className={`${inputCls} opacity-60 cursor-not-allowed`}
                            value={user?.email ?? ""}
                            disabled
                        />
                        <p className="text-[10px] text-muted-foreground">Email cannot be changed.</p>
                    </div>

                    <Button
                        size="sm"
                        className="gap-2 mt-2"
                        onClick={handleUpdateProfile}
                        disabled={saving}
                    >
                        <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </motion.div>

            {/* Password Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={card}
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 rounded-full bg-warning/20 flex items-center justify-center">
                        <Key className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
                        <p className="text-xs text-muted-foreground">Update your password</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">New Password</label>
                        <div className="relative">
                            <input
                                className={inputCls}
                                type={showPassword ? "text" : "password"}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                            <button
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Confirm Password</label>
                        <input
                            className={inputCls}
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                        />
                        {confirmPassword && newPassword !== confirmPassword && (
                            <p className="text-[10px] text-red-400">Passwords don't match</p>
                        )}
                        {confirmPassword && newPassword === confirmPassword && newPassword.length >= 6 && (
                            <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                                <Check className="h-3 w-3" /> Passwords match
                            </p>
                        )}
                    </div>

                    <Button
                        size="sm"
                        variant="outline"
                        className="gap-2 mt-2"
                        onClick={handleChangePassword}
                        disabled={saving || !newPassword || newPassword !== confirmPassword}
                    >
                        <Shield className="h-3.5 w-3.5" /> Change Password
                    </Button>
                </div>
            </motion.div>

            {/* Appearance Section */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className={card}
            >
                <div className="flex items-center gap-3 mb-5">
                    <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                        <Palette className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Appearance</h2>
                        <p className="text-xs text-muted-foreground">Customize the look and feel</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {[
                        { key: "dark" as const, label: "Dark", icon: Moon, desc: "Dark theme" },
                        { key: "light" as const, label: "Light", icon: Sun, desc: "Light theme" },
                        { key: "system" as const, label: "System", icon: Monitor, desc: "Follow OS" },
                    ].map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => {
                                setTheme(opt.key);
                                toast.success(`Theme: ${opt.label}`);
                            }}
                            className={`p-4 rounded-lg border text-center transition-all ${theme === opt.key
                                    ? "border-primary bg-primary/10 ring-1 ring-primary/50"
                                    : "border-border bg-card hover:border-primary/30"
                                }`}
                        >
                            <opt.icon className={`h-5 w-5 mx-auto mb-2 ${theme === opt.key ? "text-primary" : "text-muted-foreground"}`} />
                            <p className="text-sm font-medium text-foreground">{opt.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{opt.desc}</p>
                        </button>
                    ))}
                </div>
            </motion.div>

            {/* Account Info */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={card}
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-info/20 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-info" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-foreground">Account</h2>
                        <p className="text-xs text-muted-foreground">Account details and info</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-xs text-muted-foreground mb-0.5">User ID</p>
                        <p className="font-mono text-xs text-foreground">{user?.id?.slice(0, 16)}...</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                        <p className="text-foreground text-xs">{user?.email}</p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Settings;

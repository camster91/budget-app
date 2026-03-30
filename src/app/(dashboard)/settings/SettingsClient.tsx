"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";

interface SettingsClientProps {
    user: { id: string; email: string; name: string | null };
}

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 },
};

export function SettingsClient({ user }: SettingsClientProps) {
    const [name, setName] = useState(user.name || "");
    const [email, setEmail] = useState(user.email);
    const [profileStatus, setProfileStatus] = useState<{ ok?: boolean; msg?: string } | null>(null);
    const [profileLoading, setProfileLoading] = useState(false);

    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordStatus, setPasswordStatus] = useState<{ ok?: boolean; msg?: string } | null>(null);
    const [passwordLoading, setPasswordLoading] = useState(false);

    async function handleProfileUpdate(e: React.FormEvent) {
        e.preventDefault();
        setProfileLoading(true);
        setProfileStatus(null);
        try {
            const res = await fetch("/api/auth/update-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email }),
            });
            const data = await res.json();
            if (res.ok) {
                setProfileStatus({ ok: true, msg: "Profile updated successfully." });
            } else {
                setProfileStatus({ ok: false, msg: data.error || "Update failed." });
            }
        } catch {
            setProfileStatus({ ok: false, msg: "Network error." });
        } finally {
            setProfileLoading(false);
        }
    }

    async function handlePasswordUpdate(e: React.FormEvent) {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setPasswordStatus({ ok: false, msg: "New passwords do not match." });
            return;
        }
        if (newPassword.length < 8) {
            setPasswordStatus({ ok: false, msg: "Password must be at least 8 characters." });
            return;
        }
        setPasswordLoading(true);
        setPasswordStatus(null);
        try {
            const res = await fetch("/api/auth/update-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword, newPassword }),
            });
            const data = await res.json();
            if (res.ok) {
                setPasswordStatus({ ok: true, msg: "Password updated successfully." });
                setCurrentPassword("");
                setNewPassword("");
                setConfirmPassword("");
            } else {
                setPasswordStatus({ ok: false, msg: data.error || "Update failed." });
            }
        } catch {
            setPasswordStatus({ ok: false, msg: "Network error." });
        } finally {
            setPasswordLoading(false);
        }
    }

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-4xl space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-gradient mb-1">Settings</h2>
                <p className="text-muted-foreground text-sm font-medium">Manage your account settings and preferences.</p>
            </div>

            <div className="grid gap-6">
                {/* Profile */}
                <motion.div variants={item}>
                    <Card className="border-white/[0.08] bg-white/[0.01]">
                        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                            <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                <User className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <CardTitle>Profile</CardTitle>
                                <CardDescription>Manage your personal information.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Full Name</label>
                                        <Input
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your name"
                                            className="rounded-xl border-white/[0.1] bg-white/[0.05] focus:ring-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email Address</label>
                                        <Input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your@email.com"
                                            className="rounded-xl border-white/[0.1] bg-white/[0.05] focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                {profileStatus && (
                                    <p className={`text-sm font-medium ${profileStatus.ok ? "text-emerald-400" : "text-red-400"}`}>
                                        {profileStatus.msg}
                                    </p>
                                )}
                                <div className="flex justify-end pt-2">
                                    <Button type="submit" variant="outline" size="sm" className="rounded-xl" disabled={profileLoading}>
                                        {profileLoading ? "Saving..." : "Update Profile"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Security */}
                <motion.div variants={item}>
                    <Card className="border-white/[0.08] bg-white/[0.01]">
                        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                            <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                <Shield className="h-6 w-6" />
                            </div>
                            <div className="space-y-1">
                                <CardTitle>Security</CardTitle>
                                <CardDescription>Keep your account secure and manage access.</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Current Password</label>
                                        <Input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="rounded-xl border-white/[0.1] bg-white/[0.05] focus:ring-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">New Password</label>
                                        <Input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="rounded-xl border-white/[0.1] bg-white/[0.05] focus:ring-primary"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Confirm Password</label>
                                        <Input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="rounded-xl border-white/[0.1] bg-white/[0.05] focus:ring-primary"
                                        />
                                    </div>
                                </div>
                                {passwordStatus && (
                                    <p className={`text-sm font-medium ${passwordStatus.ok ? "text-emerald-400" : "text-red-400"}`}>
                                        {passwordStatus.msg}
                                    </p>
                                )}
                                <div className="flex justify-end pt-2">
                                    <Button type="submit" variant="outline" size="sm" className="rounded-xl" disabled={passwordLoading}>
                                        {passwordLoading ? "Updating..." : "Update Password"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </motion.div>

            </div>
        </motion.div>
    );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Shield, Wallet, Plus, Trash2, Save, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";

interface Income {
    id: string;
    name: string;
    amount: number;
    frequency: string;
    startDate: string;
    dayOfMonth: number | null;
    isActive: boolean;
}

interface SettingsClientProps {
    user: { id: string; email: string; name: string | null };
    incomes: Income[];
    createIncome: (formData: FormData) => Promise<{ success: boolean } & Record<string, unknown>>;
    deleteIncome: (id: string) => Promise<{ success: boolean } & Record<string, unknown>>;
}

export function SettingsClient({ user, incomes, createIncome, deleteIncome }: SettingsClientProps) {
    const [activeTab, setActiveTab] = useState<"profile" | "income">("profile");

    return (
        <div className="space-y-8 max-w-2xl">
            <div>
                <h2 className="text-3xl font-black tracking-tight text-gradient mb-2">Settings</h2>
                <p className="text-muted-foreground">Manage your profile, income, and pay schedule.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 rounded-xl bg-white/[0.03] w-fit">
                {[
                    { key: "profile" as const, label: "Profile", icon: User },
                    { key: "income" as const, label: "Income", icon: Wallet },
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            activeTab === tab.key
                                ? "bg-primary/15 text-primary shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                                : "text-muted-foreground hover:text-white/70"
                        )}
                    >
                        <tab.icon className="h-4 w-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === "profile" ? (
                    <motion.div
                        key="profile"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <ProfileSettings user={user} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="income"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <IncomeSettings incomes={incomes} createIncome={createIncome} deleteIncome={deleteIncome} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Profile Settings ─────────────────────────────────────────

function ProfileSettings({ user }: { user: { id: string; email: string; name: string | null } }) {
    const [name, setName] = useState(user.name || "");
    const [email, setEmail] = useState(user.email);
    const [status, setStatus] = useState<{ ok?: boolean; msg?: string } | null>(null);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setStatus(null);
        try {
            const res = await fetch("/api/auth/update-profile", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, email }),
            });
            const data = await res.json();
            if (res.ok) setStatus({ ok: true, msg: "Profile updated successfully." });
            else setStatus({ ok: false, msg: data.error || "Update failed." });
        } catch {
            setStatus({ ok: false, msg: "Network error." });
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-white/90">Profile</h3>
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </div>

            {status && (
                <p className={cn("text-xs font-medium", status.ok ? "text-emerald-400" : "text-rose-400")}>
                    {status.msg}
                </p>
            )}

            <Button type="submit" variant="gradient" disabled={loading}>
                <Save className="h-4 w-4 mr-1" /> {loading ? "Saving..." : "Save Profile"}
            </Button>
        </form>
    );
}

// ─── Income Settings ──────────────────────────────────────────

function IncomeSettings({ incomes, createIncome, deleteIncome }: {
    incomes: Income[];
    createIncome: (formData: FormData) => Promise<{ success: boolean } & Record<string, unknown>>;
    deleteIncome: (id: string) => Promise<{ success: boolean } & Record<string, unknown>>;
}) {
    const [showForm, setShowForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const res = await createIncome(formData);
        if (res.success) {
            setShowForm(false);
            e.currentTarget.reset();
        }
        setIsSubmitting(false);
    }

    return (
        <div className="glass-card rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-bold text-white/90">Income Sources</h3>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)} className="gap-1">
                    <Plus className="h-4 w-4" /> Add
                </Button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.form
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        onSubmit={handleSubmit}
                        className="space-y-4 pb-6 border-b border-white/[0.06]"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
                                <Input name="name" placeholder="e.g. Salary" required />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input name="amount" type="number" step="0.01" min="0" placeholder="2500" required className="pl-9" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Frequency</label>
                                <select
                                    name="frequency"
                                    className="h-10 w-full rounded-md border border-white/[0.08] bg-transparent px-3 text-sm text-white/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                                >
                                    <option value="monthly">Monthly</option>
                                    <option value="biweekly">Bi-weekly</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">First Pay Date</label>
                                <Input name="startDate" type="date" required />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Day of Month (optional)</label>
                            <Input name="dayOfMonth" type="number" min="1" max="31" placeholder="e.g. 15" />
                        </div>

                        <div className="flex gap-2">
                            <Button type="submit" variant="gradient" disabled={isSubmitting}>
                                <Save className="h-4 w-4 mr-1" /> {isSubmitting ? "Saving..." : "Save Income"}
                            </Button>
                            <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>

            <div className="space-y-2">
                {incomes.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No income configured yet.</p>
                ) : (
                    incomes.map((income) => (
                        <div
                            key={income.id}
                            className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                                    <Wallet className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-white/90">{income.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {income.frequency} · started {new Date(income.startDate).toLocaleDateString()}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-sm font-bold text-emerald-400">{formatCurrency(income.amount)}</span>
                                <button
                                    onClick={async () => { await deleteIncome(income.id); }}
                                    className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function cn(...classes: (string | undefined | false)[]) {
    return classes.filter(Boolean).join(" ");
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Wallet, Shield, Plus, Trash2, Save, DollarSign, Tag, AlertTriangle } from "lucide-react";
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

interface Category {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    dailyCap: number | null;
}

interface SettingsClientProps {
    user: { id: string; email: string; name: string | null };
    incomes: Income[];
    categories: Category[];
    createIncome: (formData: FormData) => Promise<{ success: boolean } & Record<string, unknown>>;
    deleteIncome: (id: string) => Promise<{ success: boolean } & Record<string, unknown>>;
    updateCategoryBudgetCap: (id: string, formData: FormData) => Promise<{ success: boolean } & Record<string, unknown>>;
}

export function SettingsClient({ user, incomes, categories, createIncome, deleteIncome, updateCategoryBudgetCap }: SettingsClientProps) {
    const [activeTab, setActiveTab] = useState<"profile" | "income" | "budgetCaps">("profile");

    return (
        <div className="space-y-8 max-w-3xl">
            <div>
                <h2 className="text-3xl font-black tracking-tight text-gradient mb-2">Settings</h2>
                <p className="text-muted-foreground">Manage your profile, income, and budget limits.</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 rounded-xl bg-white/[0.03] w-fit">
                {[
                    { key: "profile" as const, label: "Profile", icon: User },
                    { key: "income" as const, label: "Income", icon: Wallet },
                    { key: "budgetCaps" as const, label: "Budget Caps", icon: DollarSign },
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
                {activeTab === "profile" && (
                    <motion.div
                        key="profile"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <ProfileSettings user={user} />
                    </motion.div>
                )}
                {activeTab === "income" && (
                    <motion.div
                        key="income"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <IncomeSettings incomes={incomes} createIncome={createIncome} deleteIncome={deleteIncome} />
                    </motion.div>
                )}
                {activeTab === "budgetCaps" && (
                    <motion.div
                        key="budgetCaps"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <BudgetCapsSettings categories={categories} updateCategoryBudgetCap={updateCategoryBudgetCap} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Budget Caps Tab ───────────────────────────────
function BudgetCapsSettings({
    categories,
    updateCategoryBudgetCap,
}: {
    categories: Category[];
    updateCategoryBudgetCap: (id: string, formData: FormData) => Promise<{ success: boolean } & Record<string, unknown>>;
}) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    const [status, setStatus] = useState<string | null>(null);

    function startEdit(cat: Category) {
        setEditingId(cat.id);
        setValues({ ...values, [cat.id]: cat.dailyCap?.toString() || "" });
    }

    async function handleSave(id: string) {
        setStatus("Saving...");
        const fd = new FormData();
        fd.append("dailyCap", values[id] || "");
        const result = await updateCategoryBudgetCap(id, fd);
        if (result.success) {
            setEditingId(null);
            setStatus("Saved!");
            setTimeout(() => setStatus(null), 2000);
        } else {
            setStatus("Failed to save");
        }
    }

    return (
        <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white/90">Category Budget Caps</h3>
                        <p className="text-sm text-muted-foreground">Set daily limits per category. Leave blank for no limit.</p>
                    </div>
                    <Tag className="h-5 w-5 text-primary" />
                </div>

                {status && (
                    <div className="text-xs font-bold text-emerald-400">{status}</div>
                )}

                <div className="space-y-2">
                    {categories.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No categories yet. Create some on the daily page first.</p>
                    )}
                    {categories.map((cat) => (
                        <div
                            key={cat.id}
                            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                        >
                            <span className="text-lg">{cat.icon || "📌"}</span>
                            <span className="flex-1 text-sm font-medium text-white/90">{cat.name}</span>

                            {editingId === cat.id ? (
                                <>
                                    <div className="relative w-28">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
                                        <Input
                                            value={values[cat.id] || ""}
                                            onChange={(e) => setValues({ ...values, [cat.id]: e.target.value })}
                                            className="pl-5 h-8 text-sm"
                                            placeholder="no cap"
                                            type="number"
                                            step="0.01"
                                            autoFocus
                                        />
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => handleSave(cat.id)}>
                                        <Save className="h-3.5 w-3.5 text-emerald-400" />
                                    </Button>
                                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setEditingId(null)}>
                                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                    </Button>
                                </>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono text-muted-foreground">
                                        {cat.dailyCap ? formatCurrency(cat.dailyCap) : "—"}
                                    </span>
                                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => startEdit(cat)}>
                                        <DollarSign className="h-3.5 w-3.5 text-primary" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick tip */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/[0.08] border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-200/80">
                    When you approach a cap, the fuel gauge turns amber. If you exceed it, the gauge turns red and a warning appears.
                </p>
            </div>
        </div>
    );
}

// ─── Profile Tab (unchanged) ───────────────────────
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
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold text-white/90">Profile</h3>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <Button variant="gradient" type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save Profile"}
            </Button>
            {status && (
                <p className={`text-xs font-medium ${status.ok ? "text-emerald-400" : "text-rose-400"}`}>
                    {status.msg}
                </p>
            )}
        </form>
    );
}

// ─── Income Tab (unchanged) ──────────────────────
function IncomeSettings({ incomes, createIncome, deleteIncome }: {
    incomes: Income[];
    createIncome: (formData: FormData) => Promise<{ success: boolean } & Record<string, unknown>>;
    deleteIncome: (id: string) => Promise<{ success: boolean } & Record<string, unknown>>;
}) {
    const [isAdding, setIsAdding] = useState(false);
    const [form, setForm] = useState({ name: "", amount: "", frequency: "monthly", startDate: new Date().toISOString().slice(0, 10) });
    const [pending, setPending] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setPending(true);
        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("amount", form.amount);
        fd.append("frequency", form.frequency);
        fd.append("startDate", form.startDate);
        await createIncome(fd);
        setPending(false);
        setIsAdding(false);
        setForm({ name: "", amount: "", frequency: "monthly", startDate: new Date().toISOString().slice(0, 10) });
    }

    return (
        <div className="space-y-4">
            <div className="glass-card rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white/90">Income Sources</h3>
                    <Button variant="ghost" size="sm" onClick={() => setIsAdding(!isAdding)}>
                        <Plus className="h-4 w-4 text-primary" />
                        {isAdding ? "Cancel" : "Add"}
                    </Button>
                </div>

                {isAdding && (
                    <form onSubmit={handleSubmit} className="space-y-3 p-4 rounded-xl bg-white/[0.02]">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Name</label>
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Salary" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Amount</label>
                                <Input value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} type="number" placeholder="4200" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Frequency</label>
                                <select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className="h-10 w-full rounded-md border border-white/[0.08] bg-transparent px-3 text-sm text-white/90">
                                    <option value="monthly">Monthly</option>
                                    <option value="biweekly">Bi-weekly</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Start Date</label>
                                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                            </div>
                        </div>
                        <Button variant="gradient" type="submit" disabled={pending || !form.name || !form.amount}>
                            {pending ? "Adding..." : "Add Income"}
                        </Button>
                    </form>
                )}

                <div className="space-y-2">
                    {incomes.map((inc) => (
                        <div key={inc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02]">
                            <div>
                                <p className="text-sm font-medium text-white/90">{inc.name}</p>
                                <p className="text-xs text-muted-foreground">{inc.frequency} · {formatCurrency(inc.amount)}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => deleteIncome(inc.id)}>
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-rose-400" />
                            </Button>
                        </div>
                    ))}
                    {incomes.length === 0 && (
                        <p className="text-sm text-muted-foreground italic">No income sources yet. Add your first one above.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Utility ──────────────────────────────────────
function cn(...classes: (string | undefined | false)[]) {
    return classes.filter(Boolean).join(" ");
}

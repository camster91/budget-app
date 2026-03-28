"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { Target, Plus, X, Pencil, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createGoal, updateGoal, deleteGoal } from "@/app/_actions/goals";

interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
    targetDate: Date | null;
    category: { id: string; name: string; color: string | null } | null;
}

interface Category {
    id: string;
    name: string;
}

interface GoalsClientProps {
    goals: Goal[];
    categories: Category[];
}

export function GoalsClient({ goals: initialGoals, categories }: GoalsClientProps) {
    const [goals, setGoals] = useState(initialGoals);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editAmount, setEditAmount] = useState("");
    const [isPending, startTransition] = useTransition();

    function handleCreate(formData: FormData) {
        startTransition(async () => {
            const result = await createGoal(formData);
            if (result.success) {
                setShowForm(false);
                // Refresh by reloading
                window.location.reload();
            }
        });
    }

    function handleUpdate(id: string) {
        const amount = parseFloat(editAmount);
        if (isNaN(amount) || amount < 0) return;
        startTransition(async () => {
            await updateGoal(id, amount);
            setEditingId(null);
            window.location.reload();
        });
    }

    function handleDelete(id: string) {
        startTransition(async () => {
            await deleteGoal(id);
            setGoals((prev) => prev.filter((g) => g.id !== id));
        });
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Goals</h2>
                    <p className="text-muted-foreground text-sm">Track your savings targets and milestones.</p>
                </div>
                <Button onClick={() => setShowForm(true)} className="gap-2 rounded-xl">
                    <Plus className="h-4 w-4" />
                    New Goal
                </Button>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <CardTitle className="text-base">Create New Goal</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <form action={handleCreate} className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Goal Name</label>
                                        <Input name="name" placeholder="e.g. Emergency Fund" required className="rounded-xl bg-white/[0.05] border-white/[0.1]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Target Amount</label>
                                        <Input name="targetAmount" type="number" step="0.01" placeholder="10000" required className="rounded-xl bg-white/[0.05] border-white/[0.1]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Starting Amount</label>
                                        <Input name="currentAmount" type="number" step="0.01" placeholder="0" className="rounded-xl bg-white/[0.05] border-white/[0.1]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Target Date</label>
                                        <Input name="targetDate" type="date" className="rounded-xl bg-white/[0.05] border-white/[0.1]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category (optional)</label>
                                        <select name="categoryId" className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary">
                                            <option value="">No Category</option>
                                            {categories.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <Button type="submit" disabled={isPending} className="w-full rounded-xl">
                                            {isPending ? "Creating..." : "Create Goal"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {!goals.length ? (
                <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-white/[0.1] bg-transparent">
                    <div className="h-16 w-16 rounded-3xl glass flex items-center justify-center mb-6">
                        <Target className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-white text-lg font-bold mb-2">No goals yet</h3>
                    <p className="text-muted-foreground mb-8 max-w-sm">Set savings targets to stay motivated and track your progress.</p>
                    <Button onClick={() => setShowForm(true)} className="gap-2 rounded-xl">
                        <Plus className="h-4 w-4" />
                        Create First Goal
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {goals.map((goal) => {
                        const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
                        const remaining = goal.targetAmount - goal.currentAmount;
                        const isComplete = progress >= 100;

                        return (
                            <motion.div
                                key={goal.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <Card className={cn("relative overflow-hidden", isComplete && "border-emerald-500/30 bg-emerald-500/5")}>
                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                                        <div>
                                            <CardTitle className="text-base font-bold text-white mb-1">{goal.name}</CardTitle>
                                            {goal.category && (
                                                <CardDescription className="text-[10px] uppercase font-bold tracking-wider">
                                                    {goal.category.name}
                                                </CardDescription>
                                            )}
                                            {goal.targetDate && (
                                                <CardDescription className="text-[10px] mt-0.5">
                                                    Target: {new Date(goal.targetDate).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                                                </CardDescription>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => {
                                                    setEditingId(goal.id);
                                                    setEditAmount(String(goal.currentAmount));
                                                }}
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 hover:text-red-400"
                                                onClick={() => handleDelete(goal.id)}
                                                disabled={isPending}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <div className="text-2xl font-bold text-white tracking-tight">
                                                    {formatCurrency(goal.currentAmount)}
                                                </div>
                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                    of {formatCurrency(goal.targetAmount)}
                                                </div>
                                            </div>
                                            {isComplete && (
                                                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                                                    Complete!
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                                <span>Progress</span>
                                                <span className="text-white">{Math.min(Math.round(progress), 100)}%</span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-white/[0.05] overflow-hidden border border-white/[0.05]">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-500",
                                                        isComplete
                                                            ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                                            : "bg-gradient-to-r from-primary to-violet-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                                    )}
                                                    style={{ width: `${Math.min(progress, 100)}%` }}
                                                />
                                            </div>
                                            {!isComplete && (
                                                <div className="text-[10px] text-muted-foreground font-medium pt-1">
                                                    {formatCurrency(remaining)} remaining
                                                </div>
                                            )}
                                        </div>

                                        {editingId === goal.id && (
                                            <div className="flex gap-2 pt-2">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={editAmount}
                                                    onChange={(e) => setEditAmount(e.target.value)}
                                                    placeholder="Update amount"
                                                    className="rounded-xl bg-white/[0.05] border-white/[0.1] h-8 text-sm"
                                                />
                                                <Button
                                                    size="icon"
                                                    className="h-8 w-8 rounded-xl"
                                                    onClick={() => handleUpdate(goal.id)}
                                                    disabled={isPending}
                                                >
                                                    <Check className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-xl"
                                                    onClick={() => setEditingId(null)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}

                    <button
                        onClick={() => setShowForm(true)}
                        className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-primary/50 hover:bg-white/[0.02] transition-all group min-h-[220px]"
                    >
                        <Plus className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                        <span className="text-sm font-bold text-muted-foreground group-hover:text-white transition-colors">New Goal</span>
                    </button>
                </div>
            )}
        </div>
    );
}

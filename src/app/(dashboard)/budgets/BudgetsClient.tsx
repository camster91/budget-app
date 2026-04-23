"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BudgetForm } from "@/components/budgets/BudgetForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { PiggyBank, PlusCircle, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteBudget } from "@/app/_actions/budgets";
import { motion, AnimatePresence } from "framer-motion";

interface Budget {
    id: string;
    amount: number;
    period: string;
    spent: number;
    progress: number;
    remaining: number;
    category: { id: string; name: string };
}

interface Category {
    id: string;
    name: string;
}

interface BudgetsClientProps {
    budgets: Budget[];
    categories: Category[];
    period: string;
}

function formatPeriodLabel(period: string): string {
    const [year, month] = period.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });
}

function offsetPeriod(period: string, months: number): string {
    const [year, month] = period.split("-").map(Number);
    const date = new Date(year, month - 1 + months, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function BudgetsClient({ budgets: initialBudgets, categories, period }: BudgetsClientProps) {
    const router = useRouter();
    const [budgets, setBudgets] = useState(initialBudgets);
    const [tileFormKey, setTileFormKey] = useState(0);
    const [isPending, startTransition] = useTransition();

    const currentMonth = new Date().toISOString().slice(0, 7);
    const isCurrentMonth = period === currentMonth;

    function navigatePeriod(months: number) {
        const newPeriod = offsetPeriod(period, months);
        router.push(`/budgets?period=${newPeriod}`);
    }

    function handleDelete(id: string) {
        startTransition(async () => {
            const result = await deleteBudget(id);
            if (result.success) setBudgets((prev) => prev.filter((b) => b.id !== id));
        });
    }

    const totalBudgeted = budgets.reduce((sum, b) => sum + b.amount, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Budgets</h2>
                    <p className="text-muted-foreground text-sm">Control your spending by category.</p>
                </div>
                <div className="flex items-center gap-4">
                    {budgets.length > 0 && (
                        <div className="text-right hidden md:block">
                            <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">
                                {totalSpent > totalBudgeted ? "Over budget" : "Remaining"}
                            </div>
                            <div className={cn("text-xl font-bold", totalSpent > totalBudgeted ? "text-red-400" : "text-white")}>
                                {formatCurrency(Math.abs(totalBudgeted - totalSpent))}
                            </div>
                        </div>
                    )}
                    <BudgetForm categories={categories} period={period} />
                </div>
            </div>

            {/* Month navigation */}
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => navigatePeriod(-1)}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]">
                    <span className="text-sm font-bold text-white">{formatPeriodLabel(period)}</span>
                    {!isCurrentMonth && (
                        <button
                            onClick={() => router.push("/budgets")}
                            className="text-[10px] font-bold text-primary hover:text-primary/80 transition-colors ml-1"
                        >
                            Back to current
                        </button>
                    )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" onClick={() => navigatePeriod(1)}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {!budgets.length ? (
                <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-white/[0.1] bg-transparent">
                    <div className="h-16 w-16 rounded-3xl glass flex items-center justify-center mb-6">
                        <PiggyBank className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-white text-lg font-bold mb-2">No budgets for {formatPeriodLabel(period)}</h3>
                    <p className="text-muted-foreground mb-8 max-w-sm">Set monthly limits for your expense categories to keep your finances on track.</p>
                    <BudgetForm categories={categories} period={period} />
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence>
                        {budgets.map((b) => (
                            <motion.div
                                key={b.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                            >
                                <Card className="relative overflow-hidden group">
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                        <div>
                                            <CardTitle className="text-base font-bold text-white mb-1">{b.category.name}</CardTitle>
                                            <CardDescription className="text-[10px] uppercase font-bold tracking-wider">{b.period}</CardDescription>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="p-2 rounded-xl glass text-primary">
                                                <PiggyBank className="h-5 w-5" />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                                                onClick={() => handleDelete(b.id)}
                                                disabled={isPending}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-end justify-between mb-4">
                                            <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(b.amount)}</div>
                                            <div className="text-xs text-muted-foreground font-medium pb-1 flex items-center gap-2">
                                                <div className="h-1 w-1 rounded-full bg-primary" />
                                                Monthly Limit
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                                <span>Progress</span>
                                                <span className={cn(b.progress > 100 ? "text-red-400" : "text-white")}>
                                                    {Math.round(b.progress || 0)}%
                                                </span>
                                            </div>
                                            <div className="h-2 w-full rounded-full bg-white/[0.05] overflow-hidden border border-white/[0.05]">
                                                <div
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-500",
                                                        b.progress > 100
                                                            ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                                                            : "bg-gradient-to-r from-primary to-violet-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                                    )}
                                                    style={{ width: `${Math.min(b.progress || 0, 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium pt-1">
                                                <span className={cn(b.progress > 100 && "text-red-400")}>
                                                    Spent: {formatCurrency(b.spent || 0)}
                                                </span>
                                                <span className={cn(b.remaining < 0 && "text-red-400")}>
                                                    {b.remaining >= 0
                                                        ? `Remaining: ${formatCurrency(b.remaining)}`
                                                        : `Over by: ${formatCurrency(Math.abs(b.remaining))}`}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {/* "+ New Budget" tile */}
                    <div className="relative">
                        <button
                            onClick={() => setTileFormKey((k) => k + 1)}
                            className="w-full h-full flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-primary/50 hover:bg-white/[0.02] transition-all group min-h-[220px]"
                        >
                            <PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                            <span className="text-sm font-bold text-muted-foreground group-hover:text-white transition-colors">New Budget</span>
                        </button>
                        {tileFormKey > 0 && (
                            <BudgetForm key={tileFormKey} categories={categories} period={period} autoOpen />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

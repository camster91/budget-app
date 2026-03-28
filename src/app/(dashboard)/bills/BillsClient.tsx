"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { FileText, Plus, X, AlertCircle, CheckCircle2, Clock, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createBill, deleteBill } from "@/app/_actions/bills";

interface Bill {
    id: string;
    name: string;
    amount: number;
    dueDay: number;
    category: { id: string; name: string };
    account: { id: string; name: string };
}

interface Category { id: string; name: string }
interface Account { id: string; name: string }

interface BillsClientProps {
    bills: Bill[];
    categories: Category[];
    accounts: Account[];
}

function getNextDueDate(dueDay: number): Date {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);
    if (thisMonth >= today) return thisMonth;
    return new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
}

function getDaysUntilDue(dueDay: number): number {
    const next = getNextDueDate(dueDay);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getDueStatus(days: number): { label: string; color: string; icon: any } {
    if (days === 0) return { label: "Due today", color: "text-red-400", icon: AlertCircle };
    if (days <= 3) return { label: `Due in ${days}d`, color: "text-orange-400", icon: AlertCircle };
    if (days <= 7) return { label: `Due in ${days}d`, color: "text-yellow-400", icon: Clock };
    return { label: `Due in ${days}d`, color: "text-emerald-400", icon: CheckCircle2 };
}

export function BillsClient({ bills: initialBills, categories, accounts }: BillsClientProps) {
    const [bills, setBills] = useState(initialBills);
    const [showForm, setShowForm] = useState(false);
    const [isPending, startTransition] = useTransition();

    const totalMonthly = bills.reduce((sum, b) => sum + b.amount, 0);

    function handleCreate(formData: FormData) {
        startTransition(async () => {
            const result = await createBill(formData);
            if (result.success) {
                setShowForm(false);
                window.location.reload();
            }
        });
    }

    function handleDelete(id: string) {
        startTransition(async () => {
            const result = await deleteBill(id);
            if (result.success) setBills((prev) => prev.filter((b) => b.id !== id));
        });
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Bills</h2>
                    <p className="text-muted-foreground text-sm">Track your recurring payments and upcoming due dates.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-right hidden md:block">
                        <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Monthly Total</div>
                        <div className="text-xl font-bold text-white">{formatCurrency(totalMonthly)}</div>
                    </div>
                    <Button
                        onClick={() => setShowForm(true)}
                        className="gap-2 rounded-xl"
                        disabled={accounts.length === 0 || categories.length === 0}
                    >
                        <Plus className="h-4 w-4" />
                        Add Bill
                    </Button>
                </div>
            </div>

            {/* Prerequisites warning */}
            {(accounts.length === 0 || categories.length === 0) && (
                <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm">
                    <Info className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-amber-300/80">
                        {accounts.length === 0 && categories.length === 0
                            ? "You need at least one account and one category before adding bills. "
                            : accounts.length === 0
                            ? "You need at least one account before adding bills. "
                            : "You need at least one category before adding bills. "}
                        <a href={accounts.length === 0 ? "/accounts" : "/categories"} className="font-bold underline underline-offset-2 hover:text-amber-200">
                            {accounts.length === 0 ? "Add an account →" : "Add a category →"}
                        </a>
                    </p>
                </div>
            )}

            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <CardTitle className="text-base">Add New Bill</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <form action={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Bill Name</label>
                                        <Input name="name" placeholder="e.g. Netflix" required className="rounded-xl bg-white/[0.05] border-white/[0.1]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Amount</label>
                                        <Input name="amount" type="number" step="0.01" placeholder="29.99" required className="rounded-xl bg-white/[0.05] border-white/[0.1]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Due Day (1–31)</label>
                                        <Input name="dueDay" type="number" min="1" max="31" placeholder="15" required className="rounded-xl bg-white/[0.05] border-white/[0.1]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category</label>
                                        <select name="categoryId" required className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary">
                                            <option value="">Select category</option>
                                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Account</label>
                                        <select name="accountId" required className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary">
                                            <option value="">Select account</option>
                                            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <Button type="submit" disabled={isPending} className="w-full rounded-xl">
                                            {isPending ? "Adding..." : "Add Bill"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {!bills.length ? (
                <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-white/[0.1] bg-transparent">
                    <div className="h-16 w-16 rounded-3xl glass flex items-center justify-center mb-6">
                        <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-white text-lg font-bold mb-2">No bills tracked</h3>
                    <p className="text-muted-foreground mb-8 max-w-sm">Add your recurring bills to stay on top of due dates and monthly costs.</p>
                    <Button onClick={() => setShowForm(true)} className="gap-2 rounded-xl">
                        <Plus className="h-4 w-4" />
                        Add First Bill
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {bills.map((bill) => {
                        const days = getDaysUntilDue(bill.dueDay);
                        const status = getDueStatus(days);
                        const StatusIcon = status.icon;
                        const nextDate = getNextDueDate(bill.dueDay);

                        return (
                            <motion.div
                                key={bill.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <Card className={cn(
                                    "relative overflow-hidden group",
                                    days <= 3 && "border-orange-500/20 bg-orange-500/5"
                                )}>
                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                                        <div>
                                            <CardTitle className="text-base font-bold text-white mb-1">{bill.name}</CardTitle>
                                            <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                                {bill.category.name} · {bill.account.name}
                                            </p>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                                            onClick={() => handleDelete(bill.id)}
                                            disabled={isPending}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-end justify-between">
                                            <div className="text-3xl font-bold text-white tracking-tight">
                                                {formatCurrency(bill.amount)}
                                            </div>
                                            <div className={cn("flex items-center gap-1.5 text-xs font-bold", status.color)}>
                                                <StatusIcon className="h-3.5 w-3.5" />
                                                {status.label}
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t border-white/[0.05]">
                                            <p className="text-[10px] text-muted-foreground font-medium">
                                                Next due: {nextDate.toLocaleDateString(undefined, { month: "long", day: "numeric" })}
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

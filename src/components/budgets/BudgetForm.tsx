"use client";

import { useState } from "react";
import { createBudget } from "@/app/_actions/budgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface Category {
    id: string;
    name: string;
}

interface BudgetFormProps {
    categories?: Category[];
    autoOpen?: boolean;
    period?: string;
}

export function BudgetForm({ categories = [], autoOpen = false, period }: BudgetFormProps) {
    const [open, setOpen] = useState(autoOpen);
    const [amount, setAmount] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [categoryName, setCategoryName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const activePeriod = period || new Date().toISOString().slice(0, 7);
    const [year, month] = activePeriod.split("-").map(Number);
    const periodLabel = new Date(year, month - 1, 1).toLocaleString("default", { month: "long", year: "numeric" });

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Enter a valid amount");
            return;
        }
        if (!categoryId && !categoryName) {
            toast.error("Select or enter a category");
            return;
        }

        setSubmitting(true);
        const fd = new FormData();
        fd.append("amount", amount);
        fd.append("period", activePeriod);
        if (categoryId) fd.append("categoryId", categoryId);
        else fd.append("category", categoryName);

        const res = await createBudget(fd);
        setSubmitting(false);

        if (res.success) {
            setOpen(false);
            setAmount("");
            setCategoryId("");
            setCategoryName("");
            toast.success("Budget saved!");
        } else {
            toast.error(res.error);
        }
    }

    return (
        <>
            <Button variant="gradient" onClick={() => setOpen(true)}>Set Budget</Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogHeader>
                    <DialogTitle>Set Monthly Budget</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                        {categories.length > 0 ? (
                            <select
                                value={categoryId}
                                onChange={(e) => setCategoryId(e.target.value)}
                                className="flex h-10 w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-1 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                                required
                            >
                                <option value="">Select category…</option>
                                {categories.filter(c => true).map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        ) : (
                            <Input
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                placeholder="Groceries, Rent…"
                                className="rounded-xl border-white/[0.1] bg-white/[0.05]"
                            />
                        )}
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                            Applies to {periodLabel}.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Monthly Limit</label>
                        <Input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="500.00"
                            className="rounded-xl border-white/[0.1] bg-white/[0.05]"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={submitting} className="rounded-xl px-8">
                            {submitting ? "Saving…" : "Save Budget"}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </>
    );
}

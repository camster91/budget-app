"use client";

import { useState } from "react";
import { createBudget } from "@/app/_actions/budgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function BudgetForm() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        const formData = new FormData(event.currentTarget);
        const res = await createBudget(formData);
        setLoading(false);
        if (res.success) {
            setOpen(false);
        } else {
            alert(res.error);
        }
    }

    return (
        <>
            <Button onClick={() => setOpen(true)}>Set Budget</Button>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogHeader>
                    <DialogTitle>Set Monthly Budget</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <label htmlFor="category" className="text-sm font-medium">Category</label>
                        <Input name="category" type="text" required placeholder="Groceries, Rent..." />
                        <p className="text-xs text-muted-foreground">Budget applies to current month.</p>
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="amount" className="text-sm font-medium">Limit Amount</label>
                        <Input name="amount" type="number" step="0.01" required placeholder="500.00" />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Budget"}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </>
    );
}

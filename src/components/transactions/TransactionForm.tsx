"use client";

import { useState } from "react";
import { createTransaction } from "@/app/_actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function TransactionForm() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        const formData = new FormData(event.currentTarget);

        const res = await createTransaction(formData);

        setLoading(false);
        if (res.success) {
            setOpen(false);
            // Optionally toast success
        } else {
            alert(res.error);
        }
    }

    return (
        <>
            <Button onClick={() => setOpen(true)}>Add Transaction</Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogHeader>
                    <DialogTitle>New Transaction</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <label htmlFor="type" className="text-sm font-medium">Type</label>
                        <select name="type" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </select>
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="amount" className="text-sm font-medium">Amount</label>
                        <Input name="amount" type="number" step="0.01" required placeholder="0.00" />
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="description" className="text-sm font-medium">Description</label>
                        <Input name="description" type="text" required placeholder="Grocery" />
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="category" className="text-sm font-medium">Category</label>
                        <Input name="category" type="text" placeholder="Food, Rent, Salary..." />
                    </div>

                    <div className="grid gap-2">
                        <label htmlFor="date" className="text-sm font-medium">Date</label>
                        <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Saving..." : "Save Transaction"}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </>
    );
}

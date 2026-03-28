"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createTransaction } from "@/app/_actions/transactions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const transactionSchema = z.object({
    type: z.enum(["expense", "income"]),
    amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Amount must be a positive number"),
    description: z.string().min(1, "Description is required").max(100),
    categoryId: z.string().optional(),
    category: z.string().optional(),
    date: z.string().min(1, "Date is required"),
});

type TransactionValues = z.infer<typeof transactionSchema>;

interface Category {
    id: string;
    name: string;
}

interface TransactionFormProps {
    categories?: Category[];
}

export function TransactionForm({ categories = [] }: TransactionFormProps) {
    const [open, setOpen] = useState(false);
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TransactionValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            type: "expense",
            date: new Date().toISOString().split('T')[0],
        }
    });

    const onSubmit = async (data: TransactionValues) => {
        const formData = new FormData();
        formData.append("type", data.type);
        formData.append("amount", data.amount);
        formData.append("description", data.description);
        formData.append("date", data.date);
        if (data.categoryId) formData.append("categoryId", data.categoryId);
        else if (data.category) formData.append("category", data.category);

        const res = await createTransaction(formData);

        if (res.success) {
            setOpen(false);
            reset();
            toast.success("Transaction recorded!");
        } else {
            toast.error(res.error);
        }
    }

    return (
        <>
            <Button variant="gradient" onClick={() => setOpen(true)}>Add Transaction</Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogHeader>
                    <DialogTitle>New Transaction</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Type</label>
                        <select
                            {...register("type")}
                            className="flex h-10 w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        >
                            <option value="expense">Expense</option>
                            <option value="income">Income</option>
                        </select>
                        {errors.type && <p className="text-xs text-red-400">{errors.type.message}</p>}
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Amount</label>
                        <Input
                            {...register("amount")}
                            placeholder="0.00"
                            className="rounded-xl border-white/[0.1] bg-white/[0.05]"
                        />
                        {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                        <Input
                            {...register("description")}
                            type="text"
                            placeholder="e.g. Grocery Store"
                            className="rounded-xl border-white/[0.1] bg-white/[0.05]"
                        />
                        {errors.description && <p className="text-xs text-red-400">{errors.description.message}</p>}
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                        {categories.length > 0 ? (
                            <select
                                {...register("categoryId")}
                                className="flex h-10 w-full rounded-xl border border-white/[0.1] bg-white/[0.05] px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                            >
                                <option value="">Auto-detect</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        ) : (
                            <Input
                                {...register("category")}
                                type="text"
                                placeholder="Food, Rent, Salary..."
                                className="rounded-xl border-white/[0.1] bg-white/[0.05]"
                            />
                        )}
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Date</label>
                        <Input
                            {...register("date")}
                            type="date"
                            className="rounded-xl border-white/[0.1] bg-white/[0.05]"
                        />
                        {errors.date && <p className="text-xs text-red-400">{errors.date.message}</p>}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="rounded-xl px-8">
                            {isSubmitting ? "Saving..." : "Save Transaction"}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </>
    );
}

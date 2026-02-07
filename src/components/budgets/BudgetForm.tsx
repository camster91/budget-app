"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { createBudget } from "@/app/_actions/budgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

const budgetSchema = z.object({
    category: z.string().min(1, "Category is required"),
    amount: z.string().refine((v) => !isNaN(Number(v)) && Number(v) > 0, "Amount must be a positive number"),
});

type BudgetValues = z.infer<typeof budgetSchema>;

export function BudgetForm() {
    const [open, setOpen] = useState(false);
    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BudgetValues>({
        resolver: zodResolver(budgetSchema),
    });

    const onSubmit = async (data: BudgetValues) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => formData.append(key, value.toString()));

        const res = await createBudget(formData);

        if (res.success) {
            setOpen(false);
            reset();
            toast.success("Budget updated!");
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
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Category</label>
                        <Input
                            {...register("category")}
                            type="text"
                            placeholder="Groceries, Rent..."
                            className="rounded-xl border-white/[0.1] bg-white/[0.05]"
                        />
                        {errors.category && <p className="text-xs text-red-400">{errors.category.message}</p>}
                        <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Budget applies to current month.</p>
                    </div>

                    <div className="grid gap-2">
                        <label className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Limit Amount</label>
                        <Input
                            {...register("amount")}
                            placeholder="500.00"
                            className="rounded-xl border-white/[0.1] bg-white/[0.05]"
                        />
                        {errors.amount && <p className="text-xs text-red-400">{errors.amount.message}</p>}
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" className="rounded-xl" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting} className="rounded-xl px-8">
                            {isSubmitting ? "Saving..." : "Save Budget"}
                        </Button>
                    </div>
                </form>
            </Dialog>
        </>
    );
}

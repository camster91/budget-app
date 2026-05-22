"use client";

import { useEffect, useState, useTransition } from "react";
import { getPaydayRolloverStatus, sweepSurplusToGoal } from "@/app/_actions/goals";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { PiggyBank, Sparkles, ArrowRight, ArrowDownRight } from "lucide-react";

interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
}

export function SurplusSweepPrompt() {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState<{
        hasRollover: boolean;
        surplusAmount: number;
        goals: Goal[];
    } | null>(null);

    const [selectedGoalId, setSelectedGoalId] = useState("");
    const [sweepAmountStr, setSweepAmountStr] = useState("");
    const [isPending, startTransition] = useTransition();

    const fetchRolloverStatus = async () => {
        const res = await getPaydayRolloverStatus();
        if (res.success && res.hasRollover && res.surplusAmount && res.goals && res.goals.length > 0) {
            setStatus({
                hasRollover: res.hasRollover,
                surplusAmount: res.surplusAmount,
                goals: res.goals as unknown as Goal[],
            });
            setSelectedGoalId(res.goals[0].id);
            // Default sweep amount is full surplus (converted from cents to dollars)
            setSweepAmountStr((res.surplusAmount / 100).toFixed(2));
        } else {
            setStatus(null);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const fetchRolloverStatus = async () => {
            const res = await getPaydayRolloverStatus();
            if (cancelled) return;
            if (res.success && res.hasRollover && res.surplusAmount && res.goals && res.goals.length > 0) {
                setStatus({
                    hasRollover: res.hasRollover,
                    surplusAmount: res.surplusAmount,
                    goals: res.goals as unknown as Goal[],
                });
                setSelectedGoalId(res.goals[0].id);
                setSweepAmountStr((res.surplusAmount / 100).toFixed(2));
            } else {
                setStatus(null);
            }
        };

        fetchRolloverStatus();
        return () => { cancelled = true; };
    }, []);

    if (!status || !status.hasRollover || status.surplusAmount <= 0) return null;

    const handlePercentSelect = (percent: number) => {
        const amountCents = Math.round(status.surplusAmount * (percent / 100));
        setSweepAmountStr((amountCents / 100).toFixed(2));
    };

    const handleSweep = async (e: React.FormEvent) => {
        e.preventDefault();
        const amtVal = parseFloat(sweepAmountStr) || 0;
        const amtCents = Math.round(amtVal * 100);

        if (amtCents <= 0) {
            toast.error("Please enter a valid amount.");
            return;
        }

        if (amtCents > status.surplusAmount) {
            toast.error(`You can only sweep up to ${formatCurrency(status.surplusAmount)}`);
            return;
        }

        if (!selectedGoalId) {
            toast.error("Please select a savings goal.");
            return;
        }

        startTransition(async () => {
            const res = await sweepSurplusToGoal(selectedGoalId, amtCents);
            if (res.success) {
                toast.success("Rollover swept to savings successfully! 💸");
                setOpen(false);
                fetchRolloverStatus();
            } else {
                toast.error(res.error || "Sweep failed");
            }
        });
    };

    const selectedGoal = status.goals.find(g => g.id === selectedGoalId);

    return (
        <>
            {/* Banner Prompt on Dashboard */}
            <div className="glass-card p-4 rounded-2xl border-l-2 border-l-emerald-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                        <PiggyBank className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                            Payday Rollover detected!
                            <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                        </h4>
                        <p className="text-xs text-zinc-400">
                            You saved <span className="text-emerald-400 font-bold">{formatCurrency(status.surplusAmount)}</span> last period! Lock it in by sweeping it to a goal.
                        </p>
                    </div>
                </div>
                <Button
                    size="sm"
                    onClick={() => setOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-9 px-4 shrink-0"
                >
                    Sweep to Goal
                    <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
            </div>

            {/* Sweep Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md p-6">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-emerald-400">
                            <PiggyBank className="h-5 w-5" />
                            Sweep Surplus Savings
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Deploy your leftover {formatCurrency(status.surplusAmount)} to accelerate your wealth building.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSweep} className="space-y-5">
                        {/* Target Goal Select */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                                Target Savings Goal
                            </label>
                            <select
                                value={selectedGoalId}
                                onChange={(e) => setSelectedGoalId(e.target.value)}
                                className="w-full h-11 px-3 rounded-lg border border-zinc-800 bg-zinc-950 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            >
                                {status.goals.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.name} ({formatCurrency(g.currentAmount)} saved)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Amount */}
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                                    Amount to Sweep
                                </label>
                                <span className="text-[10px] text-zinc-500">
                                    Max: {formatCurrency(status.surplusAmount)}
                                </span>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">$</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    max={(status.surplusAmount / 100).toFixed(2)}
                                    min="0.01"
                                    value={sweepAmountStr}
                                    onChange={(e) => setSweepAmountStr(e.target.value)}
                                    className="pl-7 h-11 text-white border-zinc-800 focus-visible:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handlePercentSelect(25)}
                                className="flex-1 text-xs border-zinc-800 hover:bg-zinc-900"
                            >
                                25% Sweep
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handlePercentSelect(50)}
                                className="flex-1 text-xs border-zinc-800 hover:bg-zinc-900"
                            >
                                50% Sweep
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handlePercentSelect(100)}
                                className="flex-1 text-xs border-zinc-800 hover:bg-zinc-900"
                            >
                                100% Sweep
                            </Button>
                        </div>

                        {/* Goal Projection details */}
                        {selectedGoal && (
                            <div className="p-3 bg-zinc-950 rounded-xl border border-zinc-900 text-xs text-zinc-400 space-y-1">
                                <span className="font-bold text-zinc-300 block">Progress Forecast</span>
                                <div className="flex justify-between">
                                    <span>Current:</span>
                                    <span>{formatCurrency(selectedGoal.currentAmount)}</span>
                                </div>
                                <div className="flex justify-between text-emerald-400">
                                    <span className="flex items-center gap-1">
                                        <ArrowDownRight className="h-3.5 w-3.5" /> Sweep addition:
                                    </span>
                                    <span>+{formatCurrency(Math.round((parseFloat(sweepAmountStr) || 0) * 100))}</span>
                                </div>
                                <div className="border-t border-zinc-900 pt-1 mt-1 flex justify-between font-semibold text-white">
                                    <span>New Balance:</span>
                                    <span>{formatCurrency(selectedGoal.currentAmount + Math.round((parseFloat(sweepAmountStr) || 0) * 100))}</span>
                                </div>
                            </div>
                        )}

                        {/* Buttons */}
                        <div className="flex gap-2 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setOpen(false)}
                                className="flex-1 h-11 text-zinc-400 hover:text-white"
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                                disabled={isPending || !sweepAmountStr}
                            >
                                {isPending ? "Sweeping..." : "Confirm Sweep"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

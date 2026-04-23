"use client";

import { motion } from "framer-motion";
import { Wallet, Calendar, PiggyBank } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";

interface PeriodSnapshotProps {
    totalIncome: number;
    incomeSources: { name: string; amount: number }[];
    upcomingBillsTotal: number;
    dailyAllowance: number;
    daysTotal: number;
    daysElapsed: number;
    daysRemaining: number;
}

export function PeriodSnapshot({
    totalIncome,
    incomeSources,
    upcomingBillsTotal,
    dailyAllowance,
    daysTotal,
    daysElapsed,
    daysRemaining,
}: PeriodSnapshotProps) {
    const available = totalIncome - upcomingBillsTotal;
    const incomeUsedPercent = totalIncome > 0 ? Math.min(100, (upcomingBillsTotal / totalIncome) * 100) : 0;
    const daysProgress = daysTotal > 0 ? (daysElapsed / daysTotal) * 100 : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5"
        >
            <div className="flex items-center gap-2 mb-4">
                <PiggyBank className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Period Snapshot</h3>
            </div>

            {/* Income sources */}
            <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Wallet className="h-3 w-3" /> Income</span>
                    <span className="font-bold text-white/70">{formatCurrency(totalIncome)}</span>
                </div>
                {incomeSources.map((inc) => (
                    <div key={inc.name} className="flex items-center justify-between text-xs pl-4">
                        <span className="text-muted-foreground/70">{inc.name}</span>
                        <span className="font-medium text-white/60">{formatCurrency(inc.amount)}</span>
                    </div>
                ))}
            </div>

            {/* Bills vs income bar */}
            <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Bills locked</span>
                    <span className="font-medium text-white/70">{formatCurrency(upcomingBillsTotal)} ({Math.round(incomeUsedPercent)}%)</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${incomeUsedPercent}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full bg-rose-500/70"
                    />
                </div>
            </div>

            {/* Available after bills */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 mb-4">
                <span className="text-xs font-medium text-emerald-400">Free to spend</span>
                <span className="text-lg font-black text-emerald-400">{formatCurrency(available)}</span>
            </div>

            {/* Days bar */}
            <div>
                <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Period progress
                    </span>
                    <span className="font-medium text-white/70">
                        {daysElapsed}/{daysTotal} days · {daysRemaining} left
                    </span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${daysProgress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full rounded-full bg-primary/70"
                    />
                </div>
            </div>
        </motion.div>
    );
}

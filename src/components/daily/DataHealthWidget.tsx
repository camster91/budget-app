"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Activity, ShieldCheck, Zap, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DataHealthMetrics {
    totalTransactions: number;
    duplicateCount: number;
    uncategorizedCount: number;
    linkedAccounts: number;
    pendingReceipts: number;
    overallHealth: number;
}

interface DataHealthWidgetProps {
    metrics: DataHealthMetrics;
    onCleanup: () => Promise<{ success: boolean; data?: { deleted: number }; error?: string }>;
}

export function DataHealthWidget({ metrics, onCleanup }: DataHealthWidgetProps) {
    const [isPending, startTransition] = useTransition();

    const handleCleanup = () => {
        if (!confirm(`This will permanently delete ${metrics.duplicateCount} duplicate transactions. Proceed?`)) return;
        
        startTransition(async () => {
            const res = await onCleanup();
            if (res.success) {
                toast.success(`Cleanup complete! Deleted ${res.data?.deleted} duplicates.`);
            } else {
                toast.error(res.error || "Cleanup failed");
            }
        });
    };

    const healthColor = metrics.overallHealth > 90 ? "text-emerald-400" : metrics.overallHealth > 70 ? "text-amber-400" : "text-rose-400";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Data Health</h3>
                </div>
                <div className={cn("text-lg font-bold flex items-center gap-1.5", healthColor)}>
                    <Activity className="h-4 w-4" />
                    {metrics.overallHealth}%
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Duplicates</p>
                    <div className="flex items-center justify-between">
                        <span className={cn("text-xl font-bold", metrics.duplicateCount > 0 ? "text-amber-400" : "text-white/90")}>
                            {metrics.duplicateCount}
                        </span>
                        {metrics.duplicateCount > 0 && (
                            <AlertCircle className="h-3 w-3 text-amber-400/50" />
                        )}
                    </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Uncategorized</p>
                    <div className="flex items-center justify-between">
                        <span className={cn("text-xl font-bold", metrics.uncategorizedCount > 5 ? "text-rose-400" : "text-white/90")}>
                            {metrics.uncategorizedCount}
                        </span>
                    </div>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Pending OCR</p>
                    <span className="text-xl font-bold text-white/90">{metrics.pendingReceipts}</span>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Linked Banks</p>
                    <span className="text-xl font-bold text-white/90">{metrics.linkedAccounts}</span>
                </div>
            </div>

            <Button
                variant="outline"
                className="w-full rounded-xl border-white/10 bg-white/[0.02] hover:bg-white/[0.05] gap-2 text-xs font-bold uppercase tracking-widest h-10"
                onClick={handleCleanup}
                disabled={isPending || metrics.duplicateCount === 0}
            >
                {isPending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                    <Trash2 className="h-3.5 w-3.5 text-rose-400" />
                )}
                Run Auto-Cleanup
            </Button>
            
            <p className="text-[10px] text-center text-muted-foreground mt-3 italic px-2">
                * Auto-cleanup deletes confirmed duplicates to keep your budget pace accurate.
            </p>
        </motion.div>
    );
}

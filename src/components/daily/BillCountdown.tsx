"use client";

import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { FileText, Clock, Zap, CreditCard, Ban } from "lucide-react";

interface BillCountdownProps {
    bills: { name: string; amount: number; dueDay: number; daysUntil: number; isAutoDeduct: boolean }[];
    total: number;
}

export function BillCountdown({ bills, total }: BillCountdownProps) {
    const urgent = bills.filter(b => b.daysUntil <= 3);
    const normal = bills.filter(b => b.daysUntil > 3);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl overflow-hidden"
        >
            <div className="p-5 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Bills This Period</h3>
                    </div>
                    <span className="text-sm font-bold text-white/90">{formatCurrency(total)}</span>
                </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
                {bills.length === 0 ? (
                    <div className="p-8 text-center">
                        <Ban className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">No upcoming bills</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/[0.04]">
                        {urgent.map((bill, i) => (
                            <BillRow key={bill.name + i} bill={bill} isUrgent/>
                        ))}
                        {normal.map((bill, i) => (
                            <BillRow key={bill.name + i} bill={bill} />
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

function BillRow({ bill, isUrgent = false }: { bill: { name: string; amount: number; daysUntil: number; isAutoDeduct: boolean }; isUrgent?: boolean }) {
    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
        >
            <div className="flex items-center gap-3">
                <div className={
                    isUrgent
                        ? "h-8 w-8 rounded-lg bg-rose-500/15 text-rose-400 flex items-center justify-center"
                        : "h-8 w-8 rounded-lg bg-white/[0.05] text-muted-foreground flex items-center justify-center"
                }>
                    {bill.isAutoDeduct ? (
                        <Zap className="h-3.5 w-3.5" />
                    ) : (
                        <CreditCard className="h-3.5 w-3.5" />
                    )}
                </div>
                <div>
                    <p className="text-sm font-medium text-white/90">{bill.name}</p>
                    <p className={cn(
                        "text-xs font-medium flex items-center gap-1",
                        isUrgent ? "text-rose-400" : "text-muted-foreground"
                    )}>
                        <Clock className="h-3 w-3" />
                        {bill.daysUntil === 0 ? "Due today" : `${bill.daysUntil} day${bill.daysUntil !== 1 ? "s" : ""}`}
                        {bill.isAutoDeduct && " · Auto-deduct"}
                    </p>
                </div>
            </div>

            <span className="text-sm font-bold text-white/90">{formatCurrency(bill.amount)}</span>
        </motion.div>
    );
}

function cn(...classes: (string | undefined | false)[]) {
    return classes.filter(Boolean).join(" ");
}

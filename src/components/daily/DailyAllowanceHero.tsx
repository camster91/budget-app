"use client";

import { motion } from "framer-motion";
import { formatCurrency, cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Wallet, Calendar } from "lucide-react";

interface DailyAllowanceHeroProps {
    remainingToday: number;
    dailyAllowance: number;
    todaysAvailable: number;
    spentToday: number;
    accumulatedSurplus: number;
    pace: { percent: number; label: string; color: string; emoji: string };
    periodDaysRemaining: number;
}

export function DailyAllowanceHero({
    remainingToday,
    dailyAllowance,
    todaysAvailable,
    spentToday,
    accumulatedSurplus,
    pace,
    periodDaysRemaining,
}: DailyAllowanceHeroProps) {
    const isNegative = remainingToday < 0;
    const isSurplus = accumulatedSurplus > 0;
    const spentPercent = todaysAvailable > 0 ? Math.min(100, (spentToday / todaysAvailable) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden"
        >
            <div className={cn(
                "glass-card rounded-3xl p-6 md:p-8 relative overflow-hidden",
                isNegative && "border-rose-500/30 shadow-[0_0_40px_rgba(244,63,94,0.1)]"
            )}>
                {/* Background glow */}
                <div className={cn(
                    "absolute top-0 right-0 w-[60%] h-[60%] blur-[80px] rounded-full opacity-20 pointer-events-none",
                    isNegative ? "bg-rose-500" : isSurplus ? "bg-emerald-500" : "bg-primary"
                )} />

                <div className="relative z-10">
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <Wallet className={cn("h-5 w-5", pace.color)} />
                            <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                                Today&apos;s Budget
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {periodDaysRemaining} days until payday
                        </div>
                    </div>

                    {/* Big number */}
                    <div className="flex items-baseline gap-3 mb-2">
                        <motion.span
                            key={remainingToday}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className={cn(
                                "text-5xl md:text-7xl font-black tracking-tight",
                                isNegative ? "text-rose-400" : "text-white"
                            )}
                        >
                            {formatCurrency(Math.abs(remainingToday))}
                        </motion.span>
                        <span className={cn(
                            "text-sm font-bold px-2 py-0.5 rounded-full",
                            isNegative ? "text-rose-300 bg-rose-500/20" : "text-emerald-300 bg-emerald-500/20"
                        )}>
                            {isNegative ? "over" : "left"}
                        </span>
                    </div>

                    {/* Pace subtitle */}
                    <p className={cn("text-sm font-medium mb-6", pace.color)}>
                        {pace.emoji} {pace.label}
                    </p>

                    {/* Progress bars */}
                    <div className="space-y-3">
                        {/* Today's spending bar */}
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-muted-foreground">Today&apos;s spend</span>
                                <span className="text-white/70 font-medium">
                                    {formatCurrency(spentToday)} of {formatCurrency(todaysAvailable)}
                                </span>
                            </div>
                            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, spentPercent)}%` }}
                                    transition={{ duration: 0.8, ease: "circOut" }}
                                    className={cn(
                                        "h-full rounded-full",
                                        spentPercent > 90 ? "bg-rose-500" : spentPercent > 60 ? "bg-amber-500" : "bg-emerald-500"
                                    )}
                                />
                            </div>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 gap-3 pt-2">
                            <StatBox
                                label="Daily rate"
                                value={dailyAllowance}
                                icon={Minus}
                                className="text-white/70"
                            />
                            <StatBox
                                label="Rolled over"
                                value={accumulatedSurplus}
                                icon={accumulatedSurplus >= 0 ? TrendingUp : TrendingDown}
                                positive={accumulatedSurplus > 0}
                                negative={accumulatedSurplus < 0}
                            />
                            <StatBox
                                label="Spent today"
                                value={spentToday}
                                icon={TrendingDown}
                                className="text-white/70"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

function StatBox({ label, value, icon: Icon, positive, negative, className }: {
    label: string;
    value: number;
    icon: React.ElementType;
    positive?: boolean;
    negative?: boolean;
    className?: string;
}) {
    return (
        <div className="text-center p-2 rounded-xl bg-white/[0.03]">
            <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                <Icon className={cn("h-3 w-3", positive && "text-emerald-400", negative && "text-rose-400")} />
                {label}
            </div>
            <div className={cn(
                "text-sm font-bold",
                positive && "text-emerald-400",
                negative && "text-rose-400",
                className
            )}>
                {formatCurrency(value)}
            </div>
        </div>
    );
}

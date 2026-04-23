"use client";

import { motion } from "framer-motion";
import { formatCurrency, cn } from "@/lib/utils";
import { Zap, AlertTriangle, TrendingDown, TrendingUp, ArrowRight } from "lucide-react";
import { useMemo } from "react";

interface SpendingPaceGaugeProps {
    pacePercent: number;
    label: string;
    color: string;
    emoji: string;
    accumulatedSurplus: number;
    dailyAllowance: number;
    projectedMessage: string;
    daysRemaining: number;
}

export function SpendingPaceGauge({
    pacePercent,
    label,
    color,
    emoji,
    accumulatedSurplus,
    dailyAllowance,
    projectedMessage,
    daysRemaining,
}: SpendingPaceGaugeProps) {
    const circumference = 2 * Math.PI * 52;
    const strokeDashoffset = circumference - (Math.min(100, pacePercent) / 100) * circumference;

    // Determine gauge color
    const gaugeColor = pacePercent < 60 ? "#f43f5e" : pacePercent < 85 ? "#fbbf24" : pacePercent > 115 ? "#34d399" : "#818cf8";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5"
        >
            <div className="flex items-center gap-2 mb-4">
                <Zap className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Spending Pace</h3>
            </div>

            <div className="flex items-center gap-5">
                {/* Circular gauge */}
                <div className="relative w-28 h-28 shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        {/* Background track */}
                        <circle
                            cx="60" cy="60" r="52"
                            fill="none"
                            stroke="rgba(255,255,255,0.06)"
                            strokeWidth="10"
                        />
                        {/* Active arc */}
                        <motion.circle
                            cx="60" cy="60" r="52"
                            fill="none"
                            stroke={gaugeColor}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-xl font-black text-white">{pacePercent}%</span>
                        <span className="text-[10px] text-muted-foreground font-medium">pace</span>
                    </div>
                </div>

                {/* Details */}
                <div className="flex-1 space-y-3">
                    <div className={cn("flex items-center gap-2 text-sm font-bold", color)}>
                        <span>{emoji}</span>
                        <span>{label}</span>
                    </div>

                    {/* Surplus indicator */}
                    {accumulatedSurplus !== 0 && (
                        <div className="flex items-center gap-2">
                            {accumulatedSurplus > 0 ? (
                                <TrendingUp className="h-4 w-4 text-emerald-400" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-rose-400" />
                            )}
                            <span className={cn(
                                "text-xs font-medium",
                                accumulatedSurplus > 0 ? "text-emerald-400" : "text-rose-400"
                            )}>
                                {accumulatedSurplus > 0 ? "+" : ""}{formatCurrency(accumulatedSurplus)} vs daily rate
                            </span>
                        </div>
                    )}

                    {/* Projection */}
                    <div className="p-3 rounded-xl bg-white/[0.03]">
                        <div className="flex items-start gap-2">
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-xs text-muted-foreground leading-relaxed">{projectedMessage}</p>
                        </div>
                    </div>

                    {daysRemaining <= 3 && (
                        <div className="flex items-center gap-2 text-amber-400/80">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span className="text-xs font-medium">Only {daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left — stay disciplined</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

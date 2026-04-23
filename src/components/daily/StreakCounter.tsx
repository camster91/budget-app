"use client";

import { motion } from "framer-motion";
import { Flame, Award } from "lucide-react";

interface StreakCounterProps {
    streak: number; // positive = under-budget streak, negative = over-budget streak
    bestStreak?: number;
}

export function StreakCounter({ streak, bestStreak = 0 }: StreakCounterProps) {
    const isPositive = streak >= 0;
    const abs = Math.abs(streak);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 text-center"
        >
            <div className="flex items-center justify-center gap-2 mb-3">
                {isPositive ? (
                    <Flame className="h-5 w-5 text-orange-400" />
                ) : (
                    <Flame className="h-5 w-5 text-rose-400" />
                )}
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">{isPositive ? "On Fire" : "Slow Down"}</h3>
            </div>

            <div className="flex items-baseline justify-center gap-1">
                <span className={isPositive ? "text-4xl font-black text-orange-400" : "text-4xl font-black text-rose-400"}>
                    {abs}
                </span>
                <span className="text-sm text-muted-foreground font-medium">
                    day{abs !== 1 ? "s" : ""}
                </span>
            </div>

            <p className="text-xs text-muted-foreground mt-1">
                {isPositive
                    ? "Consecutive days under your daily budget"
                    : "Consecutive days over your daily budget"}
            </p>

            {bestStreak > 0 && (
                <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-amber-400/80 font-medium">Best streak: {bestStreak} days</span>
                </div>
            )}
        </motion.div>
    );
}

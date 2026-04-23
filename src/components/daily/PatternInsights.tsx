"use client";

import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";
import { BrainCircuit, Repeat, Clock, TrendingUp, AlertTriangle, BarChart3 } from "lucide-react";

interface Pattern {
    name: string;
    description: string;
    pattern: string;
    amount: number;
    confidence: number;
    suggestion?: string;
}

interface PatternInsightsProps {
    patterns: Pattern[];
}

const patternIcons: Record<string, typeof Repeat> = {
    recurring_merchant: Repeat,
    time_of_day: Clock,
    weekend_spike: TrendingUp,
    category_surge: BarChart3,
    unusual: AlertTriangle,
};

export function PatternInsights({ patterns }: PatternInsightsProps) {
    if (patterns.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl overflow-hidden"
        >
            <div className="p-5 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-violet-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Pattern Insights</h3>
                </div>
            </div>

            <div className="divide-y divide-white/[0.04]">
                {patterns.map((p, i) => {
                    const Icon = patternIcons[p.pattern] || AlertTriangle;
                    return (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.08 }}
                            className="p-4 hover:bg-white/[0.02] transition-colors"
                        >
                            <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-lg bg-violet-500/15 text-violet-400 flex items-center justify-center shrink-0 mt-0.5">
                                    <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm font-medium text-white/90 truncate">{p.name}</p>
                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 shrink-0">
                                            {Math.round(p.confidence * 100)}%
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{p.description}</p>
                                    {p.suggestion && (
                                        <p className="text-xs text-violet-300/80 mt-1.5 leading-relaxed">
                                            💡 {p.suggestion}
                                        </p>
                                    )}
                                    <div className="flex items-center gap-1 mt-1.5">
                                        <div className="h-1.5 rounded-full bg-white/[0.06] flex-1 max-w-[100px]">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${p.confidence * 100}%` }}
                                                className="h-full rounded-full bg-violet-400/50"
                                                transition={{ duration: 0.8 }}
                                            />
                                        </div>
                                        {' '}&nbsp;
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );
}

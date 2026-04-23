"use client";

import { motion } from "framer-motion";
import { Lightbulb, Sparkles } from "lucide-react";

interface SmartInsightsProps {
    insights: string[];
}

export function SmartInsights({ insights }: SmartInsightsProps) {
    if (insights.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 border-l-2 border-l-primary/50"
        >
            <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Smart Insights</h3>
            </div>

            <div className="space-y-2">
                {insights.map((insight, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="flex items-start gap-2.5 text-xs leading-relaxed text-muted-foreground"
                    >
                        <Lightbulb className="h-3.5 w-3.5 text-primary/60 shrink-0 mt-0.5" />
                        <span>{insight}</span>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

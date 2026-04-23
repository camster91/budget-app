"use client";

import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

interface SpendingScoreProps {
    score: number; // 0-100
    label?: string;
}

export function SpendingScore({ score, label }: SpendingScoreProps) {
    const clamped = Math.max(0, Math.min(100, score));
    const circumference = 2 * Math.PI * 48;
    const offset = circumference - (clamped / 100) * circumference;

    let color = "#f43f5e"; // Red
    let grade = "F";
    if (clamped >= 90) { color = "#34d399"; grade = "A"; }
    else if (clamped >= 75) { color = "#34d399"; grade = "B"; }
    else if (clamped >= 60) { color = "#fbbf24"; grade = "C"; }
    else if (clamped >= 40) { color = "#fb923c"; grade = "D"; }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5 flex items-center gap-4"
        >
            <div className="relative w-20 h-20 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="48" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
                    <motion.circle
                        cx="60" cy="60" r="48"
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-white">{grade}</span>
                </div>
            </div>

            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    <Trophy className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Spending Score</h3>
                </div>
                <p className="text-2xl font-black" style={{ color }}>{clamped}</p>
                <p className="text-xs text-muted-foreground">{label || "Based on pace, surplus, and consistency."}</p>
            </div>
        </motion.div>
    );
}

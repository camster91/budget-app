"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, ShieldAlert } from "lucide-react";

interface NoSpendToggleProps {
    isActive: boolean;
    onToggle: (active: boolean) => void;
}

export function NoSpendToggle({ isActive, onToggle }: NoSpendToggleProps) {
    const [locked, setLocked] = useState(isActive);

    function toggle() {
        const next = !locked;
        setLocked(next);
        onToggle(next);
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`glass-card rounded-2xl p-5 border-l-4 ${
                locked ? "border-l-rose-500" : "border-l-emerald-500"
            }`}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        locked ? "bg-rose-500/15 text-rose-400" : "bg-emerald-500/15 text-emerald-400"
                    }`}>
                        {locked ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white/90">
                            {locked ? "No-Spend Mode ON" : "No-Spend Mode"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {locked
                                ? "All discretionary spending is BLOCKED"
                                : "Toggle to block all non-essential spending"}
                        </p>
                    </div>
                </div>
                <button
                    onClick={toggle}
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                        locked ? "bg-rose-500" : "bg-white/10"
                    }`}
                >
                    <motion.div
                        className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow"
                        animate={{ x: locked ? 20 : 2 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    />
                </button>
            </div>

            <AnimatePresence>
                {locked && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 pt-3 border-t border-white/[0.06]"
                    >
                        <p className="text-xs text-rose-300/80">
                            🔒 Quick Spend is disabled. Only bills and income can be logged.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

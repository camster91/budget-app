"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { motion as motionDiv } from "framer-motion";
import { Clock, Trash2, Tag, Receipt, Sparkles } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface TodaysLogProps {
    entries: { id: string; description: string; amount: number; category?: string | null; source?: string | null }[];
    onDelete?: (id: string) => Promise<any>;
}

export function TodaysLog({ entries, onDelete }: TodaysLogProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null);

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this transaction?")) return;
        setDeletingId(id);
        await onDelete?.(id);
        setDeletingId(null);
    }

    const total = entries.reduce((s, e) => s + e.amount, 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl overflow-hidden"
        >
            <div className="p-5 border-b border-white/[0.06]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Today&apos;s Activity</h3>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                        {entries.length} entr{entries.length === 1 ? "y" : "ies"} · {formatCurrency(total)}
                    </span>
                </div>
            </div>

            <div className="max-h-[320px] overflow-y-auto">
                <AnimatePresence mode="popLayout">
                    {entries.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-8 text-center"
                        >
                            <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground font-medium">No spending yet today</p>
                            <p className="text-xs text-muted-foreground/60 mt-1">Tap Quick Spend above to log your first purchase</p>
                        </motion.div>
                    ) : (
                        entries.map((entry, i) => (
                            <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20, height: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="group flex items-center justify-between p-4 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={cn(
                                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                                        entry.source === "screenshot" ? "bg-violet-500/15 text-violet-400" : "bg-white/[0.05] text-muted-foreground"
                                    )}>
                                        <Receipt className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-medium text-white/90 truncate">{entry.description}</p>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            {entry.category && (
                                                <span className="inline-flex items-center gap-1">
                                                    <Tag className="h-3 w-3" />{entry.category}
                                                </span>
                                            )}
                                            {entry.source === "screenshot" && (
                                                <span className="text-violet-400/70">· from receipt</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-sm font-bold text-white/90">-{formatCurrency(entry.amount)}</span>
                                    {onDelete && (
                                        <button
                                            onClick={() => handleDelete(entry.id)}
                                            disabled={deletingId === entry.id}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

function cn(...classes: (string | undefined | false)[]) {
    return classes.filter(Boolean).join(" ");
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, Trash2, GitMerge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface DedupeReviewProps {
    duplicates: { fingerprint: string; transactions: { id: string; description: string; amount: number; date: Date }[] }[];
    onKeepAndMerge: (duplicateId: string, keepId: string) => Promise<void>;
    onRejectDuplicate: (id: string) => Promise<void>;
}

export function DedupeReview({ duplicates, onKeepAndMerge, onRejectDuplicate }: DedupeReviewProps) {
    const [activeSet, setActiveSet] = useState<string | null>(null);

    if (duplicates.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl overflow-hidden border-l-2 border-l-amber-500/50"
        >
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">
                        Duplicate Review
                    </h3>
                </div>
                <span className="text-xs text-muted-foreground">{duplicates.length} sets</span>
            </div>

            <div className="divide-y divide-white/[0.04]">
                {duplicates.map((set) => {
                    const isOpen = activeSet === set.fingerprint;
                    const tx = set.transactions;

                    return (
                        <div key={set.fingerprint}>
                            <button
                                onClick={() => setActiveSet(isOpen ? null : set.fingerprint)}
                                className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <GitMerge className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium text-white/90">{tx[0]?.description || "Unknown"}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {formatCurrency(tx[0]?.amount || 0)} · {tx.length} copies
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground">{isOpen ? "▼" : "▶"}</span>
                            </button>

                            <AnimatePresence>
                                {isOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="px-4 pb-4 space-y-2"
                                    >
                                        {tx.map((t) => (
                                            <div
                                                key={t.id}
                                                className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03]"
                                            >
                                                <div>
                                                    <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleString()}</p>
                                                    <p className="text-sm font-medium text-white/80">{t.description}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-emerald-400 hover:bg-emerald-500/10"
                                                        onClick={() => onKeepAndMerge(t.id, tx.find(x => x.id !== t.id)?.id || "")}
                                                        title="Keep this, delete others"
                                                    >
                                                        <Check className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-rose-400 hover:bg-rose-500/10"
                                                        onClick={() => onRejectDuplicate(t.id)}
                                                        title="Not a duplicate"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
}

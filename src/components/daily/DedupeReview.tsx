"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Check, Trash2, GitMerge, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface DedupeReviewProps {
    duplicates: { fingerprint: string; transactions: { id: string; description: string; amount: number; date: Date }[] }[];
    onKeepAndMerge: (duplicateId: string, keepId: string) => Promise<any>;
    onRejectDuplicate: (id: string) => Promise<any>;
}

export function DedupeReview({ duplicates, onKeepAndMerge, onRejectDuplicate }: DedupeReviewProps) {
    const [activeSet, setActiveSet] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [processingId, setProcessingId] = useState<string | null>(null);

    if (duplicates.length === 0) return null;

    const handleAction = (id: string, action: () => Promise<any>) => {
        setProcessingId(id);
        startTransition(async () => {
            await action();
            setProcessingId(null);
        });
    };

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
                <span className="text-xs text-muted-foreground">{duplicates.length} sets flagged</span>
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
                                                <div className="min-w-0 flex-1 mr-2">
                                                    <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                                                        {new Date(t.date).toLocaleDateString()} at {new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    <p className="text-sm font-medium text-white/80 truncate">{t.description}</p>
                                                </div>
                                                <div className="flex gap-1 shrink-0">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-emerald-400 hover:bg-emerald-500/10 rounded-lg"
                                                        onClick={() => handleAction(t.id, () => onKeepAndMerge(t.id, tx.find(x => x.id !== t.id)?.id || ""))}
                                                        disabled={isPending}
                                                        title="Keep this, delete others"
                                                    >
                                                        {processingId === t.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Check className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-rose-400 hover:bg-rose-500/10 rounded-lg"
                                                        onClick={() => handleAction(t.id, () => onRejectDuplicate(t.id))}
                                                        disabled={isPending}
                                                        title="Not a duplicate"
                                                    >
                                                        {processingId === t.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
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

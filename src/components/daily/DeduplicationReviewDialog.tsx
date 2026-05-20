"use client";

import { useEffect, useState, useTransition } from "react";
import { getDuplicateTransactions, resolveDuplicate } from "@/app/_actions/daily";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { ShieldAlert, Trash2, Check, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface DuplicateItem {
    id: string;
    amount: number;
    description: string;
    date: Date;
    category?: { name: string; icon?: string; color?: string } | null;
    duplicateOf?: {
        id: string;
        amount: number;
        description: string;
        date: Date;
        category?: { name: string; icon?: string; color?: string } | null;
    } | null;
}

interface DeduplicationReviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRefresh?: () => void;
}

export function DeduplicationReviewDialog({ open, onOpenChange, onRefresh }: DeduplicationReviewDialogProps) {
    const [duplicates, setDuplicates] = useState<DuplicateItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [isPending, startTransition] = useTransition();

    const fetchDuplicates = async () => {
        setLoading(true);
        const res = await getDuplicateTransactions();
        if (res.success && res.data) {
            // Assert type because date comes as string or Date from server action
            setDuplicates(res.data as unknown as DuplicateItem[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (open) {
            fetchDuplicates();
        }
    }, [open]);

    const handleResolve = async (id: string, action: "keep" | "delete") => {
        startTransition(async () => {
            const res = await resolveDuplicate(id, action);
            if (res.success) {
                toast.success(action === "delete" ? "Duplicate transaction deleted." : "Transaction marked as unique.");
                // Remove from local list
                setDuplicates(prev => prev.filter(d => d.id !== id));
                if (onRefresh) onRefresh();
            } else {
                toast.error(res.error || "Failed to resolve duplicate");
            }
        });
    };

    const handleResolveAll = async () => {
        if (!confirm(`This will permanently delete all ${duplicates.length} duplicate transactions. Proceed?`)) return;
        
        startTransition(async () => {
            let successCount = 0;
            for (const item of duplicates) {
                const res = await resolveDuplicate(item.id, "delete");
                if (res.success) successCount++;
            }
            toast.success(`Successfully deleted ${successCount} duplicate transactions.`);
            setDuplicates([]);
            onOpenChange(false);
            if (onRefresh) onRefresh();
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="mb-4">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-amber-400">
                        <ShieldAlert className="h-5 w-5" />
                        Review Duplicates ({duplicates.length})
                    </DialogTitle>
                    <DialogDescription className="text-zinc-400">
                        The system detected identical transactions on the same calendar day. Review and resolve them below.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <RefreshCw className="h-6 w-6 animate-spin text-zinc-500" />
                        </div>
                    ) : duplicates.length === 0 ? (
                        <div className="text-center py-12 text-zinc-500 text-sm">
                            No duplicate transactions found to review!
                        </div>
                    ) : (
                        duplicates.map((item) => (
                            <div
                                key={item.id}
                                className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-4 space-y-3 shadow-md"
                            >
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Original transaction */}
                                    <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800/40">
                                        <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold block mb-1">
                                            Original Transaction
                                        </span>
                                        {item.duplicateOf ? (
                                            <div>
                                                <p className="font-semibold text-white text-sm">
                                                    {item.duplicateOf.description}
                                                </p>
                                                <p className="text-xs text-zinc-400">
                                                    {format(new Date(item.duplicateOf.date), "PPP")}
                                                </p>
                                                <div className="flex justify-between items-center mt-2">
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                                                        {item.duplicateOf.category?.name || "Uncategorized"}
                                                    </span>
                                                    <span className="text-sm font-bold text-white">
                                                        {formatCurrency(item.duplicateOf.amount)}
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-zinc-500 italic py-2">
                                                Original transaction details unavailable
                                            </p>
                                        )}
                                    </div>

                                    {/* Duplicate transaction */}
                                    <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/10">
                                        <span className="text-[10px] uppercase tracking-wider text-amber-400 font-bold block mb-1">
                                            Duplicate Transaction
                                        </span>
                                        <div>
                                            <p className="font-semibold text-white text-sm">
                                                {item.description}
                                            </p>
                                            <p className="text-xs text-zinc-400">
                                                {format(new Date(item.date), "PPP")}
                                            </p>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                                                    {item.category?.name || "Uncategorized"}
                                                </span>
                                                <span className="text-sm font-bold text-amber-400">
                                                    {formatCurrency(item.amount)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-2 justify-end pt-1">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={isPending}
                                        onClick={() => handleResolve(item.id, "keep")}
                                        className="h-8 text-xs border-zinc-700 text-zinc-300 hover:text-white"
                                    >
                                        <Check className="mr-1.5 h-3.5 w-3.5" />
                                        Keep Both (Unique)
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        disabled={isPending}
                                        onClick={() => handleResolve(item.id, "delete")}
                                        className="h-8 text-xs bg-rose-950/30 text-rose-400 hover:bg-rose-900/40 border border-rose-900/30"
                                    >
                                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                        Delete Duplicate
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {duplicates.length > 1 && (
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-800">
                        <span className="text-xs text-zinc-400">
                            {duplicates.length} unresolved pairs remaining
                        </span>
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={isPending}
                            onClick={handleResolveAll}
                            className="bg-rose-600 hover:bg-rose-500 text-white"
                        >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Delete All Duplicates
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

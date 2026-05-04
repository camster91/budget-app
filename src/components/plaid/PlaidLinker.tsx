"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Lock, CheckCircle, Loader2, Unlink, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Account } from "@prisma/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface PlaidLinkerProps {
    accounts: (Account & { plaidItemId?: string | null; plaidLastSynced?: Date | null })[];
    createLinkToken: () => Promise<{ success: boolean; data?: { linkToken?: string }; error?: string }>;
    exchangeToken: (publicToken: string) => Promise<{ success: boolean; error?: string }>;
    syncTransactions?: (accountId: string) => Promise<{ success: boolean; data?: any /* eslint-disable-line @typescript-eslint/no-explicit-any */; error?: string }>;
}

export function PlaidLinker({ accounts, createLinkToken, exchangeToken, syncTransactions }: PlaidLinkerProps) {
    const [isLinking, setIsLinking] = useState(false);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [linkedCount, setLinkedCount] = useState(accounts.filter((a) => a.plaidItemId).length);

    const handleLink = useCallback(async () => {
        setIsLinking(true);
        try {
            const res = await createLinkToken();
            if (!res.success || !res.data?.linkToken) {
                toast.error(res.error || "Failed to create link token");
                setIsLinking(false);
                return;
            }

            // Dynamically load Plaid Link
            const { default: PlaidLink } = await import("react-plaid-link");

            // Open Plaid Link
            const handler = (PlaidLink as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).create({
                token: res.data.linkToken,
                onSuccess: async (publicToken: string) => {
                    const result = await exchangeToken(publicToken);
                    if (result.success) {
                        toast.success("Bank account linked successfully!");
                        setLinkedCount((c) => c + 1);
                    } else {
                        toast.error(result.error || "Failed to link bank account");
                    }
                    setIsLinking(false);
                },
                onExit: () => setIsLinking(false),
                onLoad: () => {
                    handler.open();
                },
            });
            handler.open();
        } catch {
            toast.error("An unexpected error occurred");
            setIsLinking(false);
        }
    }, [createLinkToken, exchangeToken]);

    const handleSync = useCallback(async (accountId: string) => {
        if (!syncTransactions) return;
        
        setSyncingId(accountId);
        try {
            const res = await syncTransactions(accountId);
            if (res.success && res.data) {
                toast.success(`Synced ${res.data.added} new transactions`);
            } else {
                toast.error(res.error || "Failed to sync transactions");
            }
        } catch {
            toast.error("An unexpected error occurred during sync");
        } finally {
            setSyncingId(null);
        }
    }, [syncTransactions]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Bank Sync</h3>
                </div>
                {linkedCount > 0 && (
                    <span className="text-xs font-medium text-emerald-400">{linkedCount} linked</span>
                )}
            </div>

            {linkedCount === 0 ? (
                <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-3">Connect your bank for automatic transaction import</p>
                    <Button onClick={handleLink} variant="gradient" disabled={isLinking}>
                        {isLinking ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link Bank Account"}
                    </Button>
                </div>
            ) : (
                <div className="space-y-2">
                    {accounts
                        .filter((a) => a.plaidItemId)
                        .map((a) => (
                            <div
                                key={a.id}
                                className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                                    <div className="min-w-0">
                                        <span className="text-sm font-medium text-white/90 block truncate">{a.name}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground">{formatCurrency(a.balance)}</span>
                                            {a.plaidLastSynced && (
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                    · <Clock className="h-2.5 w-2.5" /> {formatDistanceToNow(new Date(a.plaidLastSynced), { addSuffix: true })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {syncTransactions && (
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2 text-muted-foreground hover:text-white"
                                        onClick={() => handleSync(a.id)}
                                        disabled={syncingId === a.id}
                                    >
                                        <RefreshCw className={`h-4 w-4 ${syncingId === a.id ? 'animate-spin text-primary' : ''}`} />
                                    </Button>
                                )}
                            </div>
                        ))}
                    <Button onClick={handleLink} variant="outline" size="sm" className="w-full mt-2" disabled={isLinking}>
                        {isLinking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Link Another Bank"}
                    </Button>
                </div>
            )}
        </motion.div>
    );
}

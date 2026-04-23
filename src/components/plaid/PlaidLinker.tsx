"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Lock, CheckCircle, Loader2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Account } from "@prisma/client";

interface PlaidLinkerProps {
    accounts: (Account & { plaidItemId?: string | null })[];
    createLinkToken: () => Promise<{ success: boolean; data?: { linkToken?: string }; error?: string }>;
    exchangeToken: (publicToken: string) => Promise<{ success: boolean } & Record<string, unknown>>;
}

export function PlaidLinker({ accounts, createLinkToken, exchangeToken }: PlaidLinkerProps) {
    const [isLinking, setIsLinking] = useState(false);
    const [linkedCount, setLinkedCount] = useState(accounts.filter((a) => a.plaidItemId).length);

    const handleLink = useCallback(async () => {
        setIsLinking(true);
        try {
            const res = await createLinkToken();
            if (!res.success || !res.data?.linkToken) {
                setIsLinking(false);
                return;
            }

            // Dynamically load Plaid Link
            const { default: PlaidLink } = await import("react-plaid-link");

            // Open Plaid Link
            const handler = (PlaidLink as any).create({
                token: res.data.linkToken,
                onSuccess: async (publicToken: string) => {
                    const result = await exchangeToken(publicToken);
                    if (result.success) {
                        setLinkedCount((c) => c + 1);
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
            setIsLinking(false);
        }
    }, [createLinkToken, exchangeToken]);

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
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                                    <span className="text-sm font-medium text-white/90">{a.name}</span>
                                </div>
                                <span className="text-sm font-bold text-white/90">{formatCurrency(a.balance)}</span>
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

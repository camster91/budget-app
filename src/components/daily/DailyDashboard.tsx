"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDailySnapshot, getDataHealth, batchCleanupTransactions, addQuickSpend, deleteTransactionAndRevalidate } from "@/app/_actions/daily";
import { getCategories } from "@/app/_actions/categories";
import { toggleNoSpendMode } from "@/app/_actions/nospend";
import * as actions from "@/app/_actions/receipts";
import * as patternActions from "@/app/_actions/patterns";
import { createLinkToken, exchangePublicToken } from "@/app/_actions/plaid-link";
import { syncPlaidTransactions } from "@/app/_actions/plaid-sync";
import { DailyAllowanceHero } from "@/components/daily/DailyAllowanceHero";
import { QuickAddForm } from "@/components/daily/QuickAddForm";
import { TodaysLog } from "@/components/daily/TodaysLog";
import { ReceiptUploader } from "@/components/daily/ReceiptUploader";
import { BillCountdown } from "@/components/daily/BillCountdown";
import { PeriodSnapshot } from "@/components/daily/PeriodSnapshot";
import { VelocityGraph } from "@/components/daily/VelocityGraph";
import { SpendingPaceGauge } from "@/components/daily/SpendingPaceGauge";
import { DedupeReview } from "@/components/daily/DedupeReview";
import { PatternInsights } from "@/components/daily/PatternInsights";
import { NoSpendToggle } from "@/components/daily/NoSpendToggle";
import { CategoryPieToday } from "@/components/daily/CategoryPieToday";
import { DataHealthWidget } from "@/components/daily/DataHealthWidget";
import { SpendingScore } from "@/components/daily/SpendingScore";
import { StreakCounter } from "@/components/daily/StreakCounter";
import { SmartInsights } from "@/components/daily/SmartInsights";
import { PushNotifier } from "@/components/daily/PushNotifier";
import { PlaidLinker } from "@/components/plaid/PlaidLinker";
import { SurplusSweepPrompt } from "./SurplusSweepPrompt";
import { DeduplicationReviewDialog } from "./DeduplicationReviewDialog";
import { Sparkles, Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DailyDashboard({ initialAccounts }: { initialAccounts: any[] }) {
    const queryClient = useQueryClient();
    const [isDedupeOpen, setIsDedupeOpen] = useState(false);
    const [showMore, setShowMore] = useState(false);

    const { data: snapshotData, isLoading: snapshotLoading } = useQuery({
        queryKey: ["daily-snapshot"],
        queryFn: async () => {
            const res = await getDailySnapshot();
            if (!res.success) throw new Error(res.error);
            return res.data;
        },
        refetchInterval: 60 * 1000,
    });

    const { data: categories } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => { const res = await getCategories(); return res.data || []; },
    });

    const { data: pendingReceipts } = useQuery({
        queryKey: ["pending-receipts"],
        queryFn: async () => { const res = await actions.getPendingReceipts(); return res.data || []; },
    });

    const { data: patterns } = useQuery({
        queryKey: ["spending-patterns"],
        queryFn: async () => { const res = await patternActions.detectSpendingPatterns(); return res.data || []; },
    });

    const { data: velocity } = useQuery({
        queryKey: ["hourly-velocity"],
        queryFn: async () => { const res = await patternActions.getHourlyVelocity(); return res.data || []; },
    });

    const { data: duplicates } = useQuery({
        queryKey: ["duplicate-queue"],
        queryFn: async () => { const res = await patternActions.getDuplicateReviewQueue(); return res.data || []; },
    });

    const { data: health } = useQuery({
        queryKey: ["data-health"],
        queryFn: async () => { const res = await getDataHealth(); return res.data; },
    });

    const defaultSnapshot = {
        remainingToday: 0, dailyAllowance: 0, todaysAvailable: 0, spentToday: 0, accumulatedSurplus: 0,
        vaultLockedSurplus: 0, vaultReleasedSurplus: 0,
        pace: { percent: 100, label: "Loading...", color: "text-muted-foreground", emoji: "⏳" },
        period: { daysRemaining: 0, daysTotal: 30, daysElapsed: 0 },
        totalIncome: 0, incomeSources: [], upcomingBillsTotal: 0,
        entriesToday: [], upcomingBills: [], streak: 0, bestStreak: 0, spendingScore: 0, scoreLabel: "...",
        categoryBreakdownToday: [], projection: { message: "" }, smartInsights: [],
    };

    const s = snapshotData || defaultSnapshot;

    if (snapshotLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-muted-foreground animate-pulse">Calculating your daily allowance...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-8">
            {/* Hero */}
            <DailyAllowanceHero
                remainingToday={s.remainingToday}
                dailyAllowance={s.dailyAllowance}
                todaysAvailable={s.todaysAvailable}
                spentToday={s.spentToday}
                accumulatedSurplus={s.accumulatedSurplus}
                vaultLockedSurplus={s.vaultLockedSurplus}
                vaultReleasedSurplus={s.vaultReleasedSurplus}
                pace={s.pace}
                periodDaysRemaining={s.period.daysRemaining}
            />

            <SurplusSweepPrompt />

            {/* Quick Add + Receipt Upload side-by-side */}
            <div className="grid gap-6 md:grid-cols-2">
                <QuickAddForm 
                    onAdd={async (fd) => {
                        const res = await addQuickSpend(fd);
                        if (res.success) queryClient.invalidateQueries({ queryKey: ["daily-snapshot"] });
                        return res;
                    }} 
                    categories={categories || []} 
                    dailyAllowance={s.dailyAllowance}
                    daysRemaining={s.period.daysRemaining}
                />
                <ReceiptUploader
                    pendingReceipts={pendingReceipts || []}
                    onApprove={async (id, overrides) => {
                        const res = await actions.approveReceipt(id, overrides);
                        queryClient.invalidateQueries({ queryKey: ["pending-receipts"] });
                        queryClient.invalidateQueries({ queryKey: ["daily-snapshot"] });
                        return res;
                    }}
                    onReject={async (id) => {
                        const res = await actions.rejectReceipt(id);
                        queryClient.invalidateQueries({ queryKey: ["pending-receipts"] });
                        return res;
                    }}
                    onParsed={async (parsed) => {
                        await actions.saveReceiptParse({
                            imageUrl: "/receipts/ocr.jpg",
                            rawText: parsed.rawText,
                            parsed: { total: parsed.total, merchant: parsed.merchant, date: parsed.date, items: [], confidence: parsed.confidence, rawText: parsed.rawText },
                        });
                        queryClient.invalidateQueries({ queryKey: ["pending-receipts"] });
                    }}
                />
            </div>

            {/* Today's log + Bill countdown */}
            <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
                <TodaysLog 
                    entries={s.entriesToday} 
                    onDelete={async (id) => {
                        const res = await deleteTransactionAndRevalidate(id);
                        if (res.success) queryClient.invalidateQueries({ queryKey: ["daily-snapshot"] });
                        return res;
                    }} 
                />
                <BillCountdown bills={s.upcomingBills} total={s.upcomingBillsTotal} />
            </div>

            {/* Duplicate warning */}
            {duplicates && duplicates.length > 0 && (
                <div className="glass-card p-4 rounded-2xl border-l-2 border-l-amber-500 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-400" />
                        <div>
                            <h4 className="text-sm font-bold text-white">Review Duplicates</h4>
                            <p className="text-xs text-zinc-400">We detected {duplicates.length} duplicate transaction sets.</p>
                        </div>
                    </div>
                    <Button size="sm" onClick={() => setIsDedupeOpen(true)} className="bg-amber-500 hover:bg-amber-400 text-black font-bold h-8 px-4">Review</Button>
                </div>
            )}

            <DeduplicationReviewDialog open={isDedupeOpen} onOpenChange={setIsDedupeOpen}
                onRefresh={() => {
                    queryClient.invalidateQueries({ queryKey: ["duplicate-queue"] });
                    queryClient.invalidateQueries({ queryKey: ["daily-snapshot"] });
                    queryClient.invalidateQueries({ queryKey: ["data-health"] });
                }}
            />

            {/* Everything else — collapsed behind toggle */}
            <button
                onClick={() => setShowMore(!showMore)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/[0.08] text-sm text-muted-foreground hover:text-white hover:bg-white/[0.02] transition-colors"
            >
                <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? "rotate-180" : ""}`} />
                {showMore ? "Show less" : "Analytics, insights, and more"}
            </button>

            {showMore && (
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="grid gap-6 md:grid-cols-2">
                        <PeriodSnapshot
                            totalIncome={s.totalIncome} incomeSources={s.incomeSources}
                            upcomingBillsTotal={s.upcomingBillsTotal} dailyAllowance={s.dailyAllowance}
                            daysTotal={s.period.daysTotal} daysElapsed={s.period.daysElapsed}
                            daysRemaining={s.period.daysRemaining}
                        />
                        <VelocityGraph data={velocity || []} />
                    </div>
                    <div className="grid gap-6 md:grid-cols-3">
                        <SpendingPaceGauge pacePercent={s.pace.percent} label={s.pace.label} color={s.pace.color}
                            emoji={s.pace.emoji} accumulatedSurplus={s.accumulatedSurplus}
                            dailyAllowance={s.dailyAllowance} projectedMessage={s.projection.message}
                            daysRemaining={s.period.daysRemaining} />
                        <StreakCounter streak={s.streak} bestStreak={s.bestStreak} />
                        <SpendingScore score={s.spendingScore} label={s.scoreLabel} />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                        <CategoryPieToday data={s.categoryBreakdownToday} />
                        <PatternInsights patterns={patterns || []} />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <NoSpendToggle isActive={false} onToggle={async (active) => {
                            const fd = new FormData(); fd.append("isActive", active ? "true" : "false");
                            await toggleNoSpendMode(fd);
                            queryClient.invalidateQueries({ queryKey: ["daily-snapshot"] });
                        }} />
                        <PlaidLinker accounts={initialAccounts} createLinkToken={createLinkToken}
                            exchangeToken={exchangePublicToken}
                            syncTransactions={async (id) => {
                                const res = await syncPlaidTransactions(id);
                                queryClient.invalidateQueries({ queryKey: ["daily-snapshot"] });
                                return res;
                            }} />
                        {health && <DataHealthWidget metrics={health}
                            onCleanup={async () => {
                                const res = await batchCleanupTransactions();
                                queryClient.invalidateQueries({ queryKey: ["data-health"] });
                                queryClient.invalidateQueries({ queryKey: ["daily-snapshot"] });
                                return res;
                            }} />}
                    </div>
                    {s.smartInsights.length > 0 && <SmartInsights insights={s.smartInsights} />}
                </div>
            )}

            <PushNotifier />
        </div>
    );
}

"use client";

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
import { SpendingPaceGauge } from "@/components/daily/SpendingPaceGauge";
import { BillCountdown } from "@/components/daily/BillCountdown";
import { SmartInsights } from "@/components/daily/SmartInsights";
import { PeriodSnapshot } from "@/components/daily/PeriodSnapshot";
import { VelocityGraph } from "@/components/daily/VelocityGraph";
import { DedupeReview } from "@/components/daily/DedupeReview";
import { PatternInsights } from "@/components/daily/PatternInsights";
import { ReceiptUploader } from "@/components/daily/ReceiptUploader";
import { NoSpendToggle } from "@/components/daily/NoSpendToggle";
import { CategoryPieToday } from "@/components/daily/CategoryPieToday";
import { DataHealthWidget } from "@/components/daily/DataHealthWidget";
import { SpendingScore } from "@/components/daily/SpendingScore";
import { PushNotifier } from "@/components/daily/PushNotifier";
import { StreakCounter } from "@/components/daily/StreakCounter";
import { PlaidLinker } from "@/components/plaid/PlaidLinker";
import { Sparkles, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function DailyDashboard({ initialAccounts }: { initialAccounts: any /* eslint-disable-line @typescript-eslint/no-explicit-any */[] }) {
    const queryClient = useQueryClient();

    const { data: snapshotData, isLoading: snapshotLoading } = useQuery({
        queryKey: ["daily-snapshot"],
        queryFn: async () => {
            const res = await getDailySnapshot();
            if (!res.success) throw new Error(res.error);
            return res.data;
        },
        refetchInterval: 60 * 1000, // Refresh every minute
    });

    const { data: categories } = useQuery({
        queryKey: ["categories"],
        queryFn: async () => {
            const res = await getCategories();
            return res.data || [];
        },
    });

    const { data: pendingReceipts } = useQuery({
        queryKey: ["pending-receipts"],
        queryFn: async () => {
            const res = await actions.getPendingReceipts();
            return res.data || [];
        },
    });

    const { data: patterns } = useQuery({
        queryKey: ["spending-patterns"],
        queryFn: async () => {
            const res = await patternActions.detectSpendingPatterns();
            return res.data || [];
        },
    });

    const { data: velocity } = useQuery({
        queryKey: ["hourly-velocity"],
        queryFn: async () => {
            const res = await patternActions.getHourlyVelocity();
            return res.data || [];
        },
    });

    const { data: duplicates } = useQuery({
        queryKey: ["duplicate-queue"],
        queryFn: async () => {
            const res = await patternActions.getDuplicateReviewQueue();
            return res.data || [];
        },
    });

    const { data: health } = useQuery({
        queryKey: ["data-health"],
        queryFn: async () => {
            const res = await getDataHealth();
            return res.data;
        },
    });

    const defaultSnapshot = {
        remainingToday: 0, dailyAllowance: 0, todaysAvailable: 0, spentToday: 0, accumulatedSurplus: 0,
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
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-gradient">Daily Spend</h2>
                    <p className="text-sm text-muted-foreground mt-1">Live budget for this pay period</p>
                </div>
            </div>

            <DailyAllowanceHero
                remainingToday={s.remainingToday}
                dailyAllowance={s.dailyAllowance}
                todaysAvailable={s.todaysAvailable}
                spentToday={s.spentToday}
                accumulatedSurplus={s.accumulatedSurplus}
                pace={s.pace}
                periodDaysRemaining={s.period.daysRemaining}
            />

            <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
                <div className="space-y-4">
                    <QuickAddForm 
                        onAdd={async (fd) => {
                            const res = await addQuickSpend(fd);
                            if (res.success) queryClient.invalidateQueries({ queryKey: ["daily-snapshot"] });
                            return res;
                        }} 
                        categories={categories || []} 
                    />
                    <PeriodSnapshot
                        totalIncome={s.totalIncome}
                        incomeSources={s.incomeSources}
                        upcomingBillsTotal={s.upcomingBillsTotal}
                        dailyAllowance={s.dailyAllowance}
                        daysTotal={s.period.daysTotal}
                        daysElapsed={s.period.daysElapsed}
                        daysRemaining={s.period.daysRemaining}
                    />
                </div>
                <TodaysLog 
                    entries={s.entriesToday} 
                    onDelete={async (id) => {
                        const res = await deleteTransactionAndRevalidate(id);
                        if (res.success) queryClient.invalidateQueries({ queryKey: ["daily-snapshot"] });
                        return res;
                    }} 
                />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <VelocityGraph data={velocity || []} />
                <SpendingPaceGauge
                    pacePercent={s.pace.percent}
                    label={s.pace.label}
                    color={s.pace.color}
                    emoji={s.pace.emoji}
                    accumulatedSurplus={s.accumulatedSurplus}
                    dailyAllowance={s.dailyAllowance}
                    projectedMessage={s.projection.message}
                    daysRemaining={s.period.daysRemaining}
                />
                <BillCountdown bills={s.upcomingBills} total={s.upcomingBillsTotal} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <StreakCounter streak={s.streak} bestStreak={s.bestStreak} />
                <SpendingScore score={s.spendingScore} label={s.scoreLabel} />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
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
                            parsed: {
                                total: parsed.total,
                                merchant: parsed.merchant,
                                date: parsed.date,
                                items: [],
                                confidence: parsed.confidence,
                                rawText: parsed.rawText,
                            },
                        });
                        queryClient.invalidateQueries({ queryKey: ["pending-receipts"] });
                    }}
                />
                <CategoryPieToday data={s.categoryBreakdownToday} />
            </div>

            {duplicates && duplicates.length > 0 && (
                <DedupeReview
                    duplicates={duplicates}
                    onKeepAndMerge={async (id, otherId) => {
                        const res = await patternActions.keepAndMergeDuplicate(id, otherId);
                        queryClient.invalidateQueries({ queryKey: ["duplicate-queue"] });
                        queryClient.invalidateQueries({ queryKey: ["daily-snapshot"] });
                        return res;
                    }}
                    onRejectDuplicate={async (id) => {
                        const res = await patternActions.rejectDuplicate(id);
                        queryClient.invalidateQueries({ queryKey: ["duplicate-queue"] });
                        return res;
                    }}
                />
            )}

            <PatternInsights patterns={patterns || []} />

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <NoSpendToggle isActive={false} onToggle={async (active) => {
                    const fd = new FormData();
                    fd.append("isActive", active ? "true" : "false");
                    await toggleNoSpendMode(fd);
                    queryClient.invalidateQueries({ queryKey: ["daily-snapshot"] });
                }} />
                <PlaidLinker
                    accounts={initialAccounts}
                    createLinkToken={createLinkToken}
                    exchangeToken={exchangePublicToken}
                    syncTransactions={async (id) => {
                        const res = await syncPlaidTransactions(id);
                        queryClient.invalidateQueries({ queryKey: ["daily-snapshot"] });
                        return res;
                    }}
                />
                {health && (
                    <DataHealthWidget 
                        metrics={health} 
                        onCleanup={async () => {
                            const res = await batchCleanupTransactions();
                            queryClient.invalidateQueries({ queryKey: ["data-health"] });
                            queryClient.invalidateQueries({ queryKey: ["daily-snapshot"] });
                            return res;
                        }} 
                    />
                )}
            </div>

            {s.smartInsights.length > 0 && <SmartInsights insights={s.smartInsights} />}
            <PushNotifier />
        </div>
    );
}

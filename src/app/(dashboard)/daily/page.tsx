import { getDailySnapshot } from "@/app/_actions/daily";
import { addQuickSpend, deleteTransactionAndRevalidate } from "@/app/_actions/daily";
import { getCategories } from "@/app/_actions/categories";
import { getPendingReceipts, approveReceipt, rejectReceipt } from "@/app/_actions/receipts";
import { handleReceiptParsed } from "@/app/_actions/receipt-parse-handler";
import { detectSpendingPatterns, getHourlyVelocity, getDuplicateReviewQueue, keepAndMergeDuplicate, rejectDuplicate } from "@/app/_actions/patterns";

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

import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function DailyPage() {
    const [
        { data: snapshot, error },
        { data: categories },
        { data: pendingReceipts },
        { data: patterns },
        { data: velocity },
        { data: duplicates },
    ] = await Promise.all([
        getDailySnapshot(),
        getCategories(),
        getPendingReceipts(),
        detectSpendingPatterns(),
        getHourlyVelocity(),
        getDuplicateReviewQueue(),
    ]);

    const s = snapshot || {
        dailyAllowance: 0, todaysAvailable: 0, spentToday: 0, remainingToday: 0, accumulatedSurplus: 0,
        pace: { percent: 100, label: "No data", color: "text-muted-foreground", emoji: "📊" },
        period: { start: new Date(), end: new Date(), daysTotal: 30, daysElapsed: 0, daysRemaining: 30 },
        totalIncome: 0, incomeSources: [] as { name: string; amount: number }[],
        upcomingBills: [] as { name: string; amount: number; dueDay: number; daysUntil: number; isAutoDeduct: boolean }[],
        upcomingBillsTotal: 0,
        entriesToday: [] as { id: string; description: string; amount: number; category?: string | null; source?: string | null }[],
        projection: { atCurrentPace: 0, projectedEndBalance: 0, message: "" },
        smartInsights: [] as string[],
    };

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Sparkles className="h-12 w-12 text-primary/30" />
                <h2 className="text-xl font-bold text-white">Getting Started</h2>
                <p className="text-muted-foreground text-center max-w-sm">{error}</p>
                <Link href="/settings">
                    <Button variant="gradient" className="mt-2">Configure Income</Button>
                </Link>
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
                    <QuickAddForm onAdd={addQuickSpend} categories={categories || []} />
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
                <TodaysLog entries={s.entriesToday} onDelete={deleteTransactionAndRevalidate} />
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
                <ReceiptUploader
                    pendingReceipts={pendingReceipts || []}
                    onApprove={approveReceipt}
                    onReject={rejectReceipt}
                    onParsed={handleReceiptParsed}
                />
                <PatternInsights patterns={patterns || []} />
            </div>

            {duplicates && duplicates.length > 0 && (
                <DedupeReview
                    duplicates={duplicates}
                    onKeepAndMerge={keepAndMergeDuplicate}
                    onRejectDuplicate={rejectDuplicate}
                />
            )}

            {s.smartInsights.length > 0 && <SmartInsights insights={s.smartInsights} />}
        </div>
    );
}

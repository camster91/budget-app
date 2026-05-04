import { Skeleton } from "@/components/ui/skeleton";

export default function DailyLoading() {
    return (
        <div className="space-y-6 pb-8 animate-pulse">
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-9 w-48 bg-white/5 rounded-lg mb-2" />
                    <div className="h-4 w-64 bg-white/5 rounded-md" />
                </div>
            </div>

            {/* Hero Skeleton */}
            <div className="h-64 w-full bg-white/[0.03] rounded-3xl border border-white/[0.05]" />

            <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
                <div className="space-y-4">
                    {/* QuickAdd Skeleton */}
                    <div className="h-48 w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
                    {/* PeriodSnapshot Skeleton */}
                    <div className="h-64 w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
                </div>
                {/* TodaysLog Skeleton */}
                <div className="h-full min-h-[400px] w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="h-64 w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
                <div className="h-64 w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
                <div className="h-64 w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="h-32 w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
                <div className="h-32 w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="h-64 w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
                <div className="h-64 w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="h-32 w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
                <div className="h-32 w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
                <div className="h-32 w-full bg-white/[0.03] rounded-2xl border border-white/[0.05]" />
            </div>
        </div>
    );
}

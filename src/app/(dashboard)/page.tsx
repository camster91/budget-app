import { getCommandCenter } from "@/app/_actions/commandCenter";
import { formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";
import { AlertTriangle, Calendar, PiggyBank, Plus } from "lucide-react";

export const dynamic = "force-dynamic";

type CCData = NonNullable<Awaited<ReturnType<typeof getCommandCenter>>["data"]>;

export default async function DashboardPage() {
    const result = await getCommandCenter();
    const data: CCData = (result as { data?: CCData }).data ?? {
        availableToday: 0, daysRemaining: 0, dailyAllowance: 0, spentToday: 0, totalIncome: 0,
        entriesToday: [], urgentBills: [], overBudget: [],
    };

    return <CommandCenterView data={data} />;
}

function CommandCenterView({ data }: { data: CCData }) {
    return (
        <div className="space-y-6">
            {/* Hero card */}
            <div className="glass-card rounded-2xl p-8 relative overflow-hidden border-0 bg-gradient-to-br from-white/[0.05] to-transparent">
                <div className="relative z-10">
                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                        Available Today
                    </div>
                    <div className={cn(
                        "text-5xl sm:text-6xl font-black tracking-tight mb-3",
                        data.availableToday >= 0 ? "text-white" : "text-rose-400"
                    )}>
                        {formatCurrency(data.availableToday)}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-6">
                        <span>{data.daysRemaining} days remaining in period</span>
                        <span>·</span>
                        <span>{formatCurrency(data.spentToday)} spent today</span>
                        <span>·</span>
                        <span>Allowance: {formatCurrency(data.dailyAllowance)}/day</span>
                    </div>
                    <Link
                        href="/daily"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl transition-all active:scale-95"
                    >
                        <Plus className="h-4 w-4" />
                        Add Expense
                    </Link>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
            </div>

            {/* Two-column: alerts + today's log */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Left: Needs Attention */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground">
                        <AlertTriangle className="h-4 w-4 inline mr-2" />
                        Needs Attention
                    </h3>

                    {data.urgentBills.length === 0 && data.overBudget.length === 0 ? (
                        <div className="glass-card rounded-xl p-6 border-dashed border border-white/[0.06] text-center">
                            <PiggyBank className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">All clear. Nothing urgent.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {data.urgentBills.map((bill) => (
                                <Link key={bill.id} href="/bills"
                                    className="glass-card rounded-xl p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center",
                                            bill.daysUntil === 0 ? "bg-rose-500/20 text-rose-400" :
                                            bill.daysUntil <= 2 ? "bg-amber-500/20 text-amber-400" :
                                            "bg-blue-500/20 text-blue-400"
                                        )}>
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">{bill.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {bill.daysUntil === 0 ? "Due today" : `Due in ${bill.daysUntil} day${bill.daysUntil > 1 ? "s" : ""}`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-bold text-white">{formatCurrency(bill.amount)}</span>
                                </Link>
                            ))}
                            {data.overBudget.map((b) => (
                                <Link key={b.id} href="/budgets"
                                    className="glass-card rounded-xl p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors border-l-2 border-l-rose-500">
                                    <div>
                                        <p className="text-sm font-bold text-white">{b.name}</p>
                                        <p className="text-xs text-rose-400">{b.progress}% spent</p>
                                    </div>
                                    <span className="text-sm font-bold text-white">
                                        {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Today's Spending */}
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground mb-4">
                        Today&apos;s Spending
                    </h3>
                    {data.entriesToday.length === 0 ? (
                        <div className="glass-card rounded-xl p-6 border-dashed border border-white/[0.06] text-center">
                            <p className="text-sm text-muted-foreground">No spending logged today.</p>
                        </div>
                    ) : (
                        <div className="glass-card rounded-xl divide-y divide-white/[0.04] overflow-hidden">
                            {data.entriesToday.map((entry) => (
                                <div key={entry.id} className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="text-sm font-medium text-white">{entry.description}</p>
                                        <p className="text-xs text-muted-foreground">{entry.category}</p>
                                    </div>
                                    <span className="text-sm font-bold text-white">-{formatCurrency(entry.amount)}</span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between p-4 bg-white/[0.02]">
                                <p className="text-sm font-bold text-white">Total</p>
                                <span className="text-sm font-bold text-rose-400">-{formatCurrency(data.spentToday)}</span>
                            </div>
                        </div>
                    )}
                    <Link href="/transactions"
                        className="inline-block mt-3 text-xs font-medium text-muted-foreground hover:text-white transition-colors">
                        View all transactions →
                    </Link>
                </div>
            </div>
        </div>
    );
}

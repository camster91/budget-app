import { getDashboardSummary } from "@/app/_actions/dashboard";
import { formatCurrency, cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const { data } = await getDashboardSummary();
    const d: any = data || { netWorth: 0, monthlyIncome: 0, monthlyExpenses: 0, savingsRate: 0, incomeTrend: "0%", transactions: [] };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-white mb-1">Overview</h2>
                <p className="text-sm text-muted-foreground">
                    {new Date().toLocaleString("en-CA", { month: "long", year: "numeric" })}
                </p>
            </div>

            {/* 4 stats */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                {[
                    { label: "Net Worth", value: d.netWorth, icon: Wallet, color: "text-primary" },
                    { label: "Income", value: d.monthlyIncome, icon: ArrowUpRight, color: "text-emerald-400", trend: d.incomeTrend },
                    { label: "Expenses", value: d.monthlyExpenses, icon: ArrowDownRight, color: "text-rose-400" },
                    { label: "Savings Rate", value: Math.round(d.savingsRate) + "%", icon: TrendingUp, color: "text-primary", isPercent: true },
                ].map((stat) => (
                    <div key={stat.label} className="glass-card rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{stat.label}</span>
                            <stat.icon className={cn("h-4 w-4", stat.color)} />
                        </div>
                        <div className="text-2xl font-bold text-white">
                            {typeof stat.value === "number" ? formatCurrency(stat.value) : stat.value}
                        </div>
                        {stat.trend && (
                            <p className="text-xs text-muted-foreground mt-1">{stat.trend} vs last month</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Recent transactions */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-muted-foreground">Recent Activity</h3>
                    <Link href="/transactions" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors">View All</Link>
                </div>
                <div className="glass-card rounded-xl divide-y divide-white/[0.04] overflow-hidden">
                    {(d.transactions || []).length === 0 ? (
                        <div className="p-6 text-center text-sm text-muted-foreground">No transactions yet.</div>
                    ) : (
(d.transactions || []).map((t: any)
                            <div key={t.id} className="flex items-center gap-4 p-4">
                                <div className="h-10 w-10 rounded-xl glass flex items-center justify-center shrink-0">
                                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">{t.description}</p>
                                    <p className="text-xs text-muted-foreground">{t.category?.name ?? "Uncategorized"}</p>
                                </div>
                                <span className={cn("text-sm font-bold", t.type === "income" ? "text-emerald-400" : "text-white")}>
                                    {t.type === "expense" ? "-" : "+"}{formatCurrency(t.amount)}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, CreditCard, Wallet, TrendingUp, Calendar } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
    Area, AreaChart, ResponsiveContainer, Tooltip,
    XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";

const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

interface SpendingCategory { name: string; amount: number; color: string }
interface BudgetHealth { id: string; name: string; amount: number; spent: number; progress: number }
interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: Date;
    type: string;
    category?: { name: string } | null;
}
interface ChartData {
    name: string;
    total: number;
    income: number;
    expenses: number;
}

interface DashboardContentProps {
    data: {
        netWorth: number;
        monthlyIncome: number;
        monthlyExpenses: number;
        savingsRate: number;
        incomeTrend: string;
        chartData: ChartData[];
        transactions: Transaction[];
        spendingByCategory?: SpendingCategory[];
        budgetHealth?: BudgetHealth[];
    };
}

const TOOLTIP_STYLE = {
    contentStyle: {
        backgroundColor: "#18181b",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "12px",
        color: "#fff",
    },
    itemStyle: { color: "#fff" },
};

export function DashboardContent({ data }: DashboardContentProps) {
    const spending = data.spendingByCategory ?? [];
    const budgets = data.budgetHealth ?? [];
    const maxSpend = spending.reduce((m, c) => Math.max(m, c.amount), 0);

    return (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gradient mb-1">Financial Pulse</h2>
                    <p className="text-muted-foreground text-sm font-medium">Here&apos;s a summary of your wealth this month.</p>
                </div>
                <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    This Month
                </Button>
            </div>

            {/* Stat cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { title: "Net Worth", value: data.netWorth, trend: "+0%", icon: Wallet, color: "text-primary" },
                    { title: "Monthly Income", value: data.monthlyIncome, trend: data.incomeTrend, icon: ArrowUpRight, color: "text-emerald-500" },
                    { title: "Monthly Spending", value: data.monthlyExpenses, trend: "0%", icon: ArrowDownRight, color: "text-rose-500" },
                    { title: "Savings Rate", value: Math.round(data.savingsRate) + "%", trend: "0%", icon: TrendingUp, color: "text-primary" },
                ].map((stat, i) => (
                    <motion.div key={i} variants={item}>
                        <Card className="relative overflow-hidden group border-white/[0.08] bg-white/[0.02]">
                            <div className={cn("absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity", stat.color)}>
                                <stat.icon size={80} />
                            </div>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    {stat.title}
                                </CardTitle>
                                <stat.icon className={cn("h-4 w-4", stat.color)} />
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-white mb-1 tracking-tight">
                                    {typeof stat.value === "number" ? formatCurrency(stat.value) : stat.value}
                                </div>
                                <p className={cn(
                                    "text-xs font-medium flex items-center gap-1",
                                    (stat.trend.startsWith("+") || parseFloat(stat.trend) > 0) ? "text-emerald-500" : "text-rose-500"
                                )}>
                                    {stat.trend} <span className="text-muted-foreground font-normal">vs last month</span>
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Charts row */}
            <div className="grid gap-6 lg:grid-cols-7">
                {/* Wealth growth chart */}
                <motion.div variants={item} className="lg:col-span-4">
                    <Card className="h-full border-white/[0.08] bg-white/[0.02]">
                        <CardHeader>
                            <CardTitle>Cashflow</CardTitle>
                            <CardDescription>Monthly net over the last 6 months.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[280px] w-full">
                            {data.chartData.length === 0 ? (
                                <div className="h-full flex items-center justify-center opacity-30">
                                    <p className="text-sm font-medium">No historical data yet</p>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <Tooltip {...TOOLTIP_STYLE} formatter={(v: number | undefined) => formatCurrency(v ?? 0)} />
                                        <Area
                                            type="monotone"
                                            dataKey="total"
                                            stroke="#6366f1"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorTotal)"
                                        />
                                        <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                                        <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Spending by category */}
                <motion.div variants={item} className="lg:col-span-3">
                    <Card className="h-full border-white/[0.08] bg-white/[0.02]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Top Spending</CardTitle>
                                <CardDescription>By category this month.</CardDescription>
                            </div>
                            {spending.length > 0 && (
                                <Link href="/transactions" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.05]">
                                    Details
                                </Link>
                            )}
                        </CardHeader>
                        <CardContent>
                            {spending.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-center opacity-40">
                                    <CreditCard className="h-10 w-10 mb-2" />
                                    <p className="text-sm font-medium">No expenses this month</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {spending.map((cat) => (
                                        <div key={cat.name} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium text-white/80 truncate">{cat.name}</span>
                                                <span className="font-bold text-white ml-2 shrink-0">{formatCurrency(cat.amount)}</span>
                                            </div>
                                            <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${maxSpend > 0 ? (cat.amount / maxSpend) * 100 : 0}%`,
                                                        backgroundColor: cat.color || "#6366f1",
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Bottom row: budget health + recent activity */}
            <div className="grid gap-6 lg:grid-cols-7">
                {/* Budget health */}
                {budgets.length > 0 && (
                    <motion.div variants={item} className="lg:col-span-4">
                        <Card className="border-white/[0.08] bg-white/[0.02]">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Budget Health</CardTitle>
                                    <CardDescription>This month&apos;s budget progress.</CardDescription>
                                </div>
                                <Link href="/budgets" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.05]">
                                    Manage
                                </Link>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {budgets.map((b) => (
                                    <div key={b.id} className="space-y-1.5">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-white/80">{b.name}</span>
                                            <span className={cn("font-bold", b.progress > 100 ? "text-red-400" : "text-white/60")}>
                                                {formatCurrency(b.spent)} / {formatCurrency(b.amount)}
                                            </span>
                                        </div>
                                        <div className="h-1.5 w-full rounded-full bg-white/[0.05] overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-700",
                                                    b.progress > 100 ? "bg-red-500" : b.progress > 80 ? "bg-amber-400" : "bg-gradient-to-r from-primary to-violet-500"
                                                )}
                                                style={{ width: `${Math.min(b.progress, 100)}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </motion.div>
                )}

                {/* Recent activity */}
                <motion.div variants={item} className={budgets.length > 0 ? "lg:col-span-3" : "lg:col-span-7"}>
                    <Card className="border-white/[0.08] bg-white/[0.02]">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Recent Activity</CardTitle>
                                <CardDescription>Your latest transactions.</CardDescription>
                            </div>
                            <Link href="/transactions" className="text-xs font-medium text-primary hover:text-primary/80 transition-colors px-2 py-1 rounded-lg hover:bg-white/[0.05]">
                                View All
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {data.transactions.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center opacity-50">
                                        <CreditCard className="h-10 w-10 mb-2" />
                                        <p className="text-sm font-medium">No recent activity</p>
                                    </div>
                                ) : (
                                    data.transactions.map((t) => (
                                        <div key={t.id} className="flex items-center gap-4 group text-white">
                                            <div className="h-10 w-10 rounded-xl glass flex items-center justify-center group-hover:bg-primary/20 transition-colors shrink-0">
                                                <CreditCard className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold leading-none tracking-tight truncate">{t.description}</p>
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mt-0.5">
                                                    {t.category?.name ?? "Uncategorized"}
                                                </p>
                                            </div>
                                            <div className={cn("text-sm font-bold shrink-0", t.type === "income" ? "text-emerald-500" : "text-white")}>
                                                {t.type === "expense" ? "-" : "+"}{formatCurrency(t.amount)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    );
}

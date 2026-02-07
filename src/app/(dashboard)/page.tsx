"use client";

export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, ArrowUpRight, ArrowDownRight, CreditCard, Wallet, TrendingUp, Calendar, Zap } from "lucide-react";
import { formatCurrency, cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";

const data = [
    { name: "Jan", total: 1500 },
    { name: "Feb", total: 2300 },
    { name: "Mar", total: 1800 },
    { name: "Apr", total: 3200 },
    { name: "May", total: 2800 },
    { name: "Jun", total: 4500 },
    { name: "Jul", total: 4200 },
];

const container = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
};

export default function DashboardPage() {
    return (
        <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="space-y-8"
        >
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gradient mb-1">Financial Pulse</h2>
                    <p className="text-muted-foreground text-sm font-medium">Here's a summary of your wealth this month.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        This Month
                    </Button>
                    <Button variant="gradient" size="sm" className="gap-2">
                        <Zap className="h-4 w-4" />
                        Generate Insight
                    </Button>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {[
                    { title: "Net Worth", value: 12345.67, trend: "+12%", icon: Wallet, color: "text-primary" },
                    { title: "Monthly Income", value: 5432.00, trend: "+8.2%", icon: ArrowUpRight, color: "text-emerald-500" },
                    { title: "Monthly Spending", value: 2100.00, trend: "-4.5%", icon: ArrowDownRight, color: "text-rose-500" },
                    { title: "Savings Rate", value: "32%", trend: "+2.1%", icon: TrendingUp, color: "text-primary" },
                ].map((stat, i) => (
                    <motion.div key={i} variants={item}>
                        <Card className="relative overflow-hidden group">
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
                                    {typeof stat.value === 'number' ? formatCurrency(stat.value) : stat.value}
                                </div>
                                <p className={cn("text-xs font-medium flex items-center gap-1", stat.trend.includes('+') ? "text-emerald-500" : "text-rose-500")}>
                                    {stat.trend} <span className="text-muted-foreground font-normal">than last month</span>
                                </p>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <motion.div variants={item} className="col-span-4">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Wealth Growth</CardTitle>
                            <CardDescription>Visualizing your net worth trend over the last 6 months.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
                                        itemStyle={{ color: "#fff" }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#6366f1"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorTotal)"
                                    />
                                    <XAxis
                                        dataKey="name"
                                        stroke="#71717a"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <YAxis
                                        stroke="#71717a"
                                        fontSize={12}
                                        tickLine={false}
                                        axisLine={false}
                                        tickFormatter={(value) => `$${value}`}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={item} className="col-span-3">
                    <Card className="h-full">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Recent Activity</CardTitle>
                                <CardDescription>Your latest transactions.</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">View All</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {[
                                    { name: "Apple Store", cat: "Electronics", val: -999.00, icon: CreditCard },
                                    { name: "Stripe Payout", cat: "Income", val: 2500.00, icon: Wallet },
                                    { name: "Uber Eats", cat: "Food", val: -42.50, icon: CreditCard },
                                    { name: "Equinox", cat: "Health", val: -185.00, icon: CreditCard },
                                    { name: "Airbnb Refund", cat: "Travel", val: 320.00, icon: CreditCard },
                                ].map((t, i) => (
                                    <div key={i} className="flex items-center gap-4 group cursor-pointer">
                                        <div className="h-10 w-10 rounded-xl glass flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                            <t.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-bold text-white leading-none tracking-tight">{t.name}</p>
                                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{t.cat}</p>
                                        </div>
                                        <div className={cn("text-sm font-bold", t.val > 0 ? "text-emerald-500" : "text-white")}>
                                            {t.val > 0 ? "+" : ""}{formatCurrency(t.val)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>
        </motion.div>
    );
}

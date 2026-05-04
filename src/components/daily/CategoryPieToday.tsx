"use client";

import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency, cn } from "@/lib/utils";

interface CategorySpend {
    name: string;
    amount: number;
    color: string | null;
}

interface CategoryPieTodayProps {
    data: CategorySpend[];
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

export function CategoryPieToday({ data }: CategoryPieTodayProps) {
    const hasData = data.some((d) => d.amount > 0);
    const total = data.reduce((s, d) => s + d.amount, 0);

    // Limit to top 5 + others
    const sorted = [...data].sort((a, b) => b.amount - a.amount);
    const top = sorted.slice(0, 5);
    const others = sorted.slice(5).reduce((s, d) => s + d.amount, 0);
    const displayData = others > 0 ? [...top, { name: "Other", amount: others, color: "#52525b" }] : top;

    const getFill = (color: string | null) => color || "#6366f1";

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5"
        >
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Today by Category</h3>
                {total > 0 && <span className="text-xs text-muted-foreground">{formatCurrency(total)}</span>}
            </div>

            {hasData ? (
                <div className="flex items-center gap-4">
                    <div className="h-[140px] w-[140px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={displayData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={35}
                                    outerRadius={65}
                                    paddingAngle={3}
                                    dataKey="amount"
                                    stroke="none"
                                >
                                    {displayData.map((entry, i) => (
                                        <Cell key={i} fill={getFill(entry.color)} />
                                    ))}
                                </Pie>
                                <Tooltip {...TOOLTIP_STYLE} formatter={(val: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => formatCurrency(Number(val) || 0)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="flex-1 space-y-2">
                        {displayData.map((d) => (
                            <div key={d.name} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getFill(d.color) }} />
                                    <span className="text-xs text-white/80">{d.name}</span>
                                </div>
                                <span className="text-xs font-bold text-white/90">{formatCurrency(d.amount)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="h-[100px] flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">No categorized spending today</p>
                </div>
            )}
        </motion.div>
    );
}

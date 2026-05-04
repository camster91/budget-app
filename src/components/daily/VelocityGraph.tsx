"use client";

import { motion } from "framer-motion";
import {
    BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

interface HourlySpend {
    hour: string;
    amount: number;
    cumulative: number;
}

interface VelocityGraphProps {
    data: HourlySpend[];
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

export function VelocityGraph({ data }: VelocityGraphProps) {
    const hasData = data.some((d) => d.amount > 0);
    const total = data.reduce((s, d) => s + d.amount, 0);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white/90">Daily Velocity</h3>
                </div>
                <span className="text-xs text-muted-foreground">{hasData ? `${new Date().toLocaleDateString()}` : "No data"}</span>
            </div>

            {hasData ? (
                <div className="h-[160px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <XAxis
                                dataKey="hour"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "#a1a1aa", fontSize: 10 }}
                            />
                            <YAxis hide />
                            <Tooltip {...TOOLTIP_STYLE} formatter={(val: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => [`$${Number(val).toFixed(2)}`, "Spent"]} />
                            <Bar
                                dataKey="amount"
                                fill="#6366f1"
                                radius={[4, 4, 0, 0]}
                                maxBarSize={24}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-[120px] flex items-center justify-center">
                    <p className="text-xs text-muted-foreground">No spending yet today — check back after your first purchase</p>
                </div>
            )}

            {total > 0 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                    ${total.toFixed(2)} total · shows where in the day you spend most
                </p>
            )}
        </motion.div>
    );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Calendar, TrendingUp, TrendingDown, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";

interface WeeklyData {
  weekRange: string;
  total: number;
  change: number;
  transactionCount: number;
  byDay: { name: string; amount: number }[];
  byCategory: { id: string | null; amount: number }[];
  topCategory: { id: string | null; amount: number };
  averagePerDay: number;
}

interface MonthlyData {
  month: string;
  total: number;
  change: number;
  transactionCount: number;
  byWeek: { name: string; amount: number }[];
  averagePerDay: number;
  highestDay: number;
}

interface ReviewClientProps {
  initialWeekly: WeeklyData | null;
  initialMonthly: MonthlyData | null;
  months: string[];
}

export function ReviewClient({ initialWeekly, initialMonthly, months }: ReviewClientProps) {
  const [view, setView] = useState<"weekly" | "monthly">("weekly");
  const [selectedMonth, setSelectedMonth] = useState(months[0]);
  const [monthly, setMonthly] = useState(initialMonthly);
  const [weekly, setWeekly] = useState(initialWeekly);

  async function loadMonth(month: string) {
    const res = await fetch(`/api/review/monthly?month=${month}`);
    const data = await res.json();
    if (data.success) setMonthly(data.data);
  }

  const data = view === "monthly" ? monthly : weekly;
  const trendColor = (data && "change" in data)
    ? data.change <= 0 ? "text-emerald-400" : "text-rose-400"
    : "text-muted-foreground";

  const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"];

  return (
    <div className="space-y-8 pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-gradient">Review</h2>
          <p className="text-sm text-muted-foreground mt-1">Weekly and monthly spending reviews</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("weekly")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              view === "weekly" ? "bg-white/[0.05] text-white" : "text-muted-foreground hover:text-white/70"
            )}
          >
            Weekly
          </button>
          <button
            onClick={() => setView("monthly")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
              view === "monthly" ? "bg-white/[0.05] text-white" : "text-muted-foreground hover:text-white/70"
            )}
          >
            Monthly
          </button>
        </div>
      </div>

      {view === "monthly" && (
        <div className="flex gap-2">
          {months.map((m) => (
            <button
              key={m}
              onClick={() => { setSelectedMonth(m); loadMonth(m); }}
              className={cn(
                "px-3 py-1 rounded-lg text-xs font-medium transition-all",
                selectedMonth === m ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-white/70"
              )}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {!data ? (
        <div className="text-center py-20 text-muted-foreground">No data yet</div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-4">
            <StatCard
              label="Total Spent"
              value={formatCurrency(data.total)}
              icon={data.total > 0 ? TrendingDown : TrendingUp}
              className="text-white"
            />
            <StatCard
              label="Change"
              value={`${data.change >= 0 ? "+" : ""}${data.change.toFixed(1)}%`}
              icon={data.change <= 0 ? TrendingDown : TrendingUp}
              className={trendColor}
            />
            <StatCard
              label="Transactions"
              value={data.transactionCount.toString()}
              icon={Calendar}
              className="text-white"
            />
            <StatCard
              label="Avg/Day"
              value={formatCurrency("averagePerDay" in data ? data.averagePerDay : data.averagePerDay)}
              icon={TrendingUp}
              className="text-white"
            />
          </div>

          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 mb-4">
              {view === "weekly" ? "Spending by Day" : "Spending by Week"}
            </h3>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={view === "weekly" ? (data as WeeklyData).byDay : (data as MonthlyData).byWeek}>
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "#fff" }}
                    formatter={(val: number) => formatCurrency(val)}
                  />
                  <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                    {(view === "weekly" ? (data as WeeklyData).byDay : (data as MonthlyData).byWeek).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <TopCategories categories={(data as WeeklyData).byCategory || []} />
            <ExportPanel onExportCSV={async () => {
              const res = await fetch(`/api/export/csv${view === "monthly" ? `?month=${selectedMonth}` : ""}`);
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `glowos-${view === "weekly" ? "weekly" : selectedMonth}.csv`;
              a.click();
            }} />
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, icon: Icon, className }: { label: string; value: string; icon: any; className?: string }) {
  return (
    <div className="glass-card rounded-2xl p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <Icon className="h-3.5 w-3.5" />
        <span className="font-bold uppercase tracking-wider">{label}</span>
      </div>
      <div className={cn("text-2xl font-black", className)}>{value}</div>
    </div>
  );
}

function TopCategories({ categories }: { categories: { id: string | null; amount: number }[] }) {
  const total = categories.reduce((s, c) => s + c.amount, 0);
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 mb-3">Top Categories</h3>
      <div className="space-y-2">
        {categories.slice(0, 5).map((c, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6"][i] }} />
              <span className="text-xs text-white/80">Category {i + 1}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-16 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full rounded-full bg-primary" style={{ width: `${total > 0 ? (c.amount / total) * 100 : 0}%` }} />
              </div>
              <span className="text-xs font-bold text-white/90">{formatCurrency(c.amount)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportPanel({ onExportCSV }: { onExportCSV: () => void }) {
  return (
    <div className="glass-card rounded-2xl p-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 mb-3">Export</h3>
      <div className="space-y-2">
        <Button variant="outline" className="w-full justify-start gap-2" onClick={onExportCSV}>
          <Download className="h-4 w-4" />
          Download CSV
        </Button>
        <p className="text-[10px] text-muted-foreground">Compatible with Excel, Google Sheets, QuickBooks</p>
      </div>
    </div>
  );
}

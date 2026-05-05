"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface Bill {
    id: string;
    name: string;
    amount: number;
    dueDay: number;
    category: { name: string };
}

interface BillCalendarProps {
    bills: Bill[];
    onMarkPaid?: (id: string) => void;
    isPaidThisMonth?: (id: string) => boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];

function getCalendarDays(year: number, month: number) {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    return cells;
}

function getBillsForDay(bills: Bill[], day: number) {
    return bills.filter((b) => b.dueDay === day);
}

export function BillCalendar({ bills, onMarkPaid, isPaidThisMonth }: BillCalendarProps) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(today.getFullYear());
    const [viewMonth, setViewMonth] = useState(today.getMonth());

    const cells = getCalendarDays(viewYear, viewMonth);

    function prevMonth() {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    }

    const monthName = `${MONTHS[viewMonth]} ${viewYear}`;
    const todayDay = today.getFullYear() === viewYear && today.getMonth() === viewMonth ? today.getDate() : -1;

    // Get upcoming bills sorted by due day
    const upcomingBills = [...bills]
        .filter(b => {
            const due = getNextDueDay(b.dueDay, viewYear, viewMonth);
            return due !== null;
        })
        .sort((a, b) => a.dueDay - b.dueDay);

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-white">Bill Calendar</h2>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={prevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-bold text-white w-36 text-center">{monthName}</span>
                    <Button variant="ghost" size="icon" className="rounded-xl" onClick={nextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                {/* Day headers */}
                <div className="grid grid-cols-7 border-b border-white/[0.06]">
                    {DAYS.map((d) => (
                        <div key={d} className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            {d}
                        </div>
                    ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                    {cells.map((day, idx) => {
                        const dayBills = day ? getBillsForDay(bills, day) : [];
                        const isToday = day === todayDay;
                        const isEmpty = day === null;

                        return (
                            <div
                                key={idx}
                                className={cn(
                                    "min-h-[80px] border-b border-r border-white/[0.04] p-1.5 relative",
                                    idx % 7 === 6 && "border-r-0",
                                    isEmpty && "bg-white/[0.01]",
                                    !isEmpty && "hover:bg-white/[0.02] transition-colors",
                                )}
                            >
                                {day !== null && (
                                    <>
                                        <div className={cn(
                                            "text-xs font-bold mb-1",
                                            isToday ? "w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground" : "text-muted-foreground",
                                        )}>
                                            {day}
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            {dayBills.slice(0, 2).map((bill) => {
                                                const paid = isPaidThisMonth?.(bill.id);
                                                return (
                                                    <div
                                                        key={bill.id}
                                                        className={cn(
                                                            "rounded-md px-1.5 py-0.5 text-[10px] font-bold truncate cursor-pointer transition-all",
                                                            paid
                                                                ? "bg-emerald-500/10 text-emerald-400/60 line-through"
                                                                : "bg-primary/20 text-primary border border-primary/20 hover:bg-primary/30",
                                                        )}
                                                        title={`${bill.name} — $${bill.amount}`}
                                                    >
                                                        {bill.name}
                                                    </div>
                                                );
                                            })}
                                            {dayBills.length > 2 && (
                                                <div className="text-[10px] text-muted-foreground font-medium pl-1">
                                                    +{dayBills.length - 2} more
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Upcoming bills list */}
            {upcomingBills.length > 0 && (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.06]">
                        <h3 className="text-sm font-bold text-white">Upcoming This Month</h3>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                        {upcomingBills.map((bill) => {
                            const due = getNextDueDay(bill.dueDay, viewYear, viewMonth)!;
                            const daysUntil = due - today.getDate();
                            const paid = isPaidThisMonth?.(bill.id);
                            return (
                                <div key={bill.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold",
                                            daysUntil <= 3 && !paid ? "bg-orange-500/20 text-orange-400" :
                                            daysUntil <= 7 && !paid ? "bg-yellow-500/20 text-yellow-400" :
                                            "bg-white/5 text-muted-foreground",
                                        )}>
                                            {bill.dueDay}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-white flex items-center gap-2">
                                                {bill.name}
                                                {paid && (
                                                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                                        <Check className="h-3 w-3" /> Paid
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-muted-foreground">{bill.category.name} · Due the {ordinal(bill.dueDay)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="text-sm font-bold text-white">${bill.amount.toFixed(2)}</div>
                                        {!paid && onMarkPaid && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-7 text-xs rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 gap-1"
                                                onClick={() => onMarkPaid(bill.id)}
                                            >
                                                <Check className="h-3 w-3" />
                                                Mark Paid
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function ordinal(n: number): string {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getNextDueDay(dueDay: number, year: number, month: number): number | null {
    const today = new Date();
    const thisMonth = new Date(year, month, dueDay);
    if (thisMonth >= today) return thisMonth.getDate();
    const nextMonth = new Date(year, month + 1, dueDay);
    if (nextMonth.getDate() === dueDay) return nextMonth.getDate();
    return null;
}
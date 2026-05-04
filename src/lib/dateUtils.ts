import {
    startOfDay, differenceInDays,
    addWeeks, addMonths, isBefore,
    setDate, getDaysInMonth,
} from "date-fns";

export interface IncomeLike {
    frequency: string;
    startDate: Date;
    dayOfMonth: number | null;
}

export interface BillLike {
    name: string;
    amount: number;
    dueDay: number;
    frequency?: string;
}

export function getNextPayDate(income: IncomeLike, from: Date = new Date()): Date {
    const { frequency, startDate, dayOfMonth } = income;
    let next = startOfDay(startDate);
    const target = startOfDay(from);

    // If today is a pay date, we are looking for the NEXT one to define the period end
    while (isBefore(next, target) || next.getTime() === target.getTime()) {
        if (frequency === "weekly") {
            next = addWeeks(next, 1);
        } else if (frequency === "biweekly") {
            next = addWeeks(next, 2);
        } else {
            next = addMonths(next, 1);
            if (dayOfMonth) {
                const daysInMonth = getDaysInMonth(next);
                next = setDate(next, Math.min(dayOfMonth, daysInMonth));
            }
        }
    }
    return next;
}

export function getPeriodStart(income: IncomeLike, nextPayDate: Date): Date {
    const { frequency, startDate } = income;
    let periodStart = startOfDay(startDate);

    while (true) {
        let candidate: Date;
        if (frequency === "weekly") candidate = addWeeks(periodStart, 1);
        else if (frequency === "biweekly") candidate = addWeeks(periodStart, 2);
        else candidate = addMonths(periodStart, 1);

        if (isBefore(candidate, nextPayDate)) {
            periodStart = candidate;
        } else {
            break;
        }
    }
    return periodStart;
}

export function isBillDueInPeriod(bill: BillLike, periodStart: Date, periodEnd: Date): boolean {
    const startDay = periodStart.getDate();
    const endDay = periodEnd.getDate();
    const startMonth = periodStart.getMonth();
    const endMonth = periodEnd.getMonth();

    if (startMonth === endMonth) {
        return bill.dueDay >= startDay && bill.dueDay < endDay;
    }
    return bill.dueDay >= startDay || bill.dueDay < endDay;
}

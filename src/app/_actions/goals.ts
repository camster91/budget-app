"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { createGoalSchema, updateGoalSchema, validateFormData } from "@/lib/validation";
import { toCents } from "@/lib/utils";
import { getNextPayDate, getPeriodStart, isBillDueInPeriod } from "@/lib/dateUtils";
import { differenceInDays, isBefore } from "date-fns";

export async function createGoal(formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validated = validateFormData(formData, createGoalSchema);
    if (!validated.success) return { success: false, error: validated.error };

    const { name, targetAmount, currentAmount, categoryId, targetDate } = validated.data;

    try {
        await prisma.goal.create({
            data: { 
                name, 
                targetAmount: toCents(targetAmount), 
                currentAmount: toCents(currentAmount), 
                categoryId,
                targetDate: targetDate ?? null,
                householdId: user.householdId,
            },
        });
        revalidatePath("/goals");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to create goal" };
    }
}

export async function updateGoal(id: string, formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validated = validateFormData(formData, updateGoalSchema);
    if (!validated.success) return { success: false, error: validated.error };

    const { name, targetAmount, currentAmount, categoryId, targetDate } = validated.data;

    try {
        await prisma.goal.update({
            where: { id, householdId: user.householdId },
            data: {
                name,
                targetAmount: toCents(targetAmount),
                currentAmount: toCents(currentAmount),
                categoryId: categoryId ?? null,
                targetDate: targetDate ?? null,
            },
        });
        revalidatePath("/goals");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update goal" };
    }
}

export async function deleteGoal(id: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        await prisma.goal.delete({ where: { id, householdId: user.householdId } });
        revalidatePath("/goals");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete goal" };
    }
}

export async function getPaydayRolloverStatus() {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const incomes = await prisma.income.findMany({
            where: { householdId: user.householdId }
        });
        if (incomes.length === 0) return { success: true, hasRollover: false, surplusAmount: 0, goals: [] };

        const now = new Date();
        const payDates = incomes.map(i => getNextPayDate(i, now));
        const nextPayDate = payDates.reduce((a, b) => isBefore(a, b) ? a : b);
        const primaryIncome = incomes[payDates.indexOf(nextPayDate)];
        const periodStart = getPeriodStart(primaryIncome, nextPayDate);

        const prevNextPayDate = periodStart;
        const prevPeriodStart = getPeriodStart(primaryIncome, prevNextPayDate);

        const bills = await prisma.bill.findMany({
            where: { isActive: true, householdId: user.householdId },
        });
        const prevBillsTotal = bills
            .filter(b => isBillDueInPeriod(b, prevPeriodStart, prevNextPayDate))
            .reduce((s, b) => s + b.amount, 0);

        const prevPeriodSpending = await prisma.transaction.findMany({
            where: {
                type: "expense",
                date: { gte: prevPeriodStart, lt: prevNextPayDate },
                isTransfer: false,
                isDuplicate: false,
                householdId: user.householdId
            }
        });
        const prevSpent = prevPeriodSpending.reduce((s, t) => s + t.amount, 0);

        const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
        const prevDiscretionary = totalIncome - prevBillsTotal;
        const prevSurplus = prevDiscretionary - prevSpent;

        const sweeps = await prisma.transaction.findMany({
            where: {
                type: "expense",
                description: { startsWith: "Swept surplus to Goal:" },
                date: { gte: periodStart },
                householdId: user.householdId
            }
        });
        const totalSwept = sweeps.reduce((s, t) => s + t.amount, 0);
        const unsweptSurplus = prevSurplus - totalSwept;

        const daysIntoNewPeriod = differenceInDays(now, periodStart);
        const hasRollover = unsweptSurplus > 100 && daysIntoNewPeriod <= 7;

        const goals = await prisma.goal.findMany({
            where: { householdId: user.householdId }
        });

        return {
            success: true,
            hasRollover,
            surplusAmount: Math.max(0, unsweptSurplus),
            goals
        };
    } catch (error) {
        console.error(error);
        return { success: false, error: "Failed to load rollover status" };
    }
}

export async function sweepSurplusToGoal(goalId: string, amount: number) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const goal = await prisma.goal.findUnique({
            where: { id: goalId, householdId: user.householdId }
        });
        if (!goal) return { success: false, error: "Goal not found" };

        await prisma.goal.update({
            where: { id: goalId },
            data: { currentAmount: { increment: amount } }
        });

        await prisma.transaction.create({
            data: {
                amount,
                description: `Swept surplus to Goal: ${goal.name}`,
                type: "expense",
                isTransfer: false,
                isDuplicate: false,
                date: new Date(),
                householdId: user.householdId
            }
        });

        revalidatePath("/daily");
        revalidatePath("/goals");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Sweep failed" };
    }
}

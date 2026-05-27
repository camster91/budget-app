import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";
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
        const today = new Date();
        const nextPayDate = getNextPayDate(today);
        const daysUntilPay = differenceInDays(nextPayDate, today);
        const periodStart = getPeriodStart(today, nextPayDate);

        const bills = await prisma.bill.findMany({
            where: { householdId: user.householdId, isActive: true },
            include: { category: true, account: true },
        });

        const periodBills = bills.filter(b => isBillDueInPeriod(b, periodStart, nextPayDate));
        const billsTotal = periodBills.reduce((sum, b) => sum + b.amount, 0);

        const periodIncome = await prisma.transaction.aggregate({
            where: {
                householdId: user.householdId,
                type: "income",
                date: { gte: periodStart },
            },
            _sum: { amount: true },
        });
        const incomeTotal = periodIncome._sum.amount ?? 0;

        const periodExpenses = await prisma.transaction.aggregate({
            where: {
                householdId: user.householdId,
                type: "expense",
                date: { gte: periodStart },
            },
            _sum: { amount: true },
        });
        const expensesTotal = periodExpenses._sum.amount ?? 0;

        const remaining = incomeTotal - billsTotal - expensesTotal;
        const needsTopUp = remaining < 0;

        return {
            success: true,
            daysUntilPay,
            nextPayDate,
            billsTotal,
            incomeTotal,
            expensesTotal,
            remaining,
            needsTopUp,
            bills: periodBills,
        };
    } catch (error) {
        console.error("[getPaydayRolloverStatus]", error);
        return { success: false, error: "Failed to calculate rollover" };
    }
}

export async function sweepSurplusToGoal(goalId: string, amount: number) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const goal = await prisma.goal.findUnique({
            where: { id: goalId, householdId: user.householdId },
        });
        if (!goal) return { success: false, error: "Goal not found" };

        await prisma.goal.update({
            where: { id: goalId },
            data: { currentAmount: { increment: amount } },
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

export async function getGoalContributions(goalId: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const contributions = await prisma.goalContribution.findMany({
            where: { goalId, householdId: user.householdId },
            orderBy: { createdAt: "desc" },
            take: 20,
        });
        return { success: true, contributions };
    } catch (error) {
        return { success: false, error: "Failed to load contributions" };
    }
}

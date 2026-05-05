export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getBudgets } from "@/app/_actions/budgets";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { BudgetsClient } from "./BudgetsClient";

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const { period } = await searchParams;
    const currentPeriod = period || new Date().toISOString().slice(0, 7);

    const [{ data: budgets }, categories] = await Promise.all([
        getBudgets(currentPeriod),
        prisma.category.findMany({
            where: { type: "expense", householdId: user.householdId },
            orderBy: { name: "asc" },
        }),
    ]);

    return <BudgetsClient budgets={budgets || []} categories={categories} period={currentPeriod} />;
}
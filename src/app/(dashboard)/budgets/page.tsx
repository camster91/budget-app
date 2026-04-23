export const dynamic = "force-dynamic";

import { getBudgets } from "@/app/_actions/budgets";
import { prisma } from "@/lib/prisma";
import { BudgetsClient } from "./BudgetsClient";

export default async function BudgetsPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
    const { period } = await searchParams;
    const currentPeriod = period || new Date().toISOString().slice(0, 7);

    const [{ data: budgets }, categories] = await Promise.all([
        getBudgets(currentPeriod),
        prisma.category.findMany({ where: { type: "expense" }, orderBy: { name: "asc" } }),
    ]);

    return <BudgetsClient budgets={budgets || []} categories={categories} period={currentPeriod} />;
}

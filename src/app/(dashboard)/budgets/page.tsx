export const dynamic = "force-dynamic";

import { getBudgets } from "@/app/_actions/budgets";
import { prisma } from "@/lib/prisma";
import { BudgetsClient } from "./BudgetsClient";

export default async function BudgetsPage() {
    const [{ data: budgets }, categories] = await Promise.all([
        getBudgets(),
        prisma.category.findMany({ where: { type: "expense" }, orderBy: { name: "asc" } }),
    ]);

    return <BudgetsClient budgets={budgets || []} categories={categories} />;
}

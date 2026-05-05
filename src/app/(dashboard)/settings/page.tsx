export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { SettingsClient } from "./SettingsClient";
import { createIncome, deleteIncome } from "@/app/_actions/incomes";
import { updateCategoryBudgetCap } from "@/app/_actions/categories";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const auth = await getAuthUser();
    if (!auth) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { id: true, email: true, name: true },
    });

    if (!user) redirect("/login");

    const incomes = await prisma.income.findMany  ({ orderBy: { createdAt: "desc" } });
    const categories = await prisma.category.findMany  ({ orderBy: { name: "asc" } });

    return (
        <SettingsClient
            user={user}
            incomes={incomes as any /* eslint-disable-line @typescript-eslint/no-explicit-any */}
            categories={categories}
            createIncome={createIncome}
            deleteIncome={deleteIncome}
            updateCategoryBudgetCap={updateCategoryBudgetCap}
        />
    );
}

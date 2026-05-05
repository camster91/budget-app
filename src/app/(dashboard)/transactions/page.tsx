export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getTransactions } from "@/app/_actions/transactions";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { TransactionsClient } from "./TransactionsClient";

export default async function TransactionsPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const [{ data: transactions }, categories] = await Promise.all([
        getTransactions(),
        prisma.category.findMany({
            where: { householdId: user.householdId },
            orderBy: { name: "asc" },
        }),
    ]);

    return <TransactionsClient transactions={transactions || []} categories={categories} />;
}
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getTransactions } from "@/app/_actions/transactions";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { TransactionsClient } from "./TransactionsClient";

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<{ dateFrom?: string; dateTo?: string; page?: string }> }) {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const { dateFrom, dateTo, page } = await searchParams;
    const pageNum = page ? Math.max(1, parseInt(page)) : 1;
    const PAGE_SIZE = 25;

    const [result, categories] = await Promise.all([
        getTransactions(dateFrom, dateTo, pageNum, PAGE_SIZE),
        prisma.category.findMany({
            where: { householdId: user.householdId },
            orderBy: { name: "asc" },
        }),
    ]);

    return (
        <TransactionsClient
            transactions={result.data || []}
            totalCount={result.totalCount || 0}
            categories={categories}
            dateFrom={dateFrom}
            dateTo={dateTo}
            currentPage={pageNum}
            pageSize={PAGE_SIZE}
        />
    );
}
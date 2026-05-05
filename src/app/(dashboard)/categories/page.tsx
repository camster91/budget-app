export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { CategoriesClient } from "./CategoriesClient";

export default async function CategoriesPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const categories = await prisma.category.findMany({
        where: { householdId: user.householdId },
        orderBy: { name: "asc" },
        include: {
            _count: { select: { transactions: true } },
        },
    });

    return <CategoriesClient categories={categories} />;
}
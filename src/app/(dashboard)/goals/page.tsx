export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { GoalsClient } from "./GoalsClient";

export default async function GoalsPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const [goals, categories] = await Promise.all([
        prisma.goal.findMany({
            where: { householdId: user.householdId },
            include: { category: true },
            orderBy: { createdAt: "desc" },
        }),
        prisma.category.findMany({
            where: { householdId: user.householdId },
            orderBy: { name: "asc" },
        }),
    ]);

    return <GoalsClient goals={goals} categories={categories} />;
}
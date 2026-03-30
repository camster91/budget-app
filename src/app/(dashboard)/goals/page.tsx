export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { GoalsClient } from "./GoalsClient";

export default async function GoalsPage() {
    const [goals, categories] = await Promise.all([
        prisma.goal.findMany({
            include: { category: true },
            orderBy: { createdAt: "desc" },
        }),
        prisma.category.findMany({ orderBy: { name: "asc" } }),
    ]);

    return <GoalsClient goals={goals} categories={categories} />;
}

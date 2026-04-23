export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { SettingsClient } from "./SettingsClient";
import { createIncome, deleteIncome } from "@/app/_actions/incomes";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const auth = await getAuthUser();
    if (!auth) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { id: true, email: true, name: true },
    });

    if (!user) redirect("/login");

    const incomes = await prisma.income.findMany({ orderBy: { createdAt: "desc" } });

    return (
        <SettingsClient
            user={user}
            incomes={incomes}
            createIncome={createIncome}
            deleteIncome={deleteIncome}
        />
    );
}

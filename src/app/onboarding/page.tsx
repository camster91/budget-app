import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createIncome } from "@/app/_actions/incomes";
import { createCategory } from "@/app/_actions/categories";
import { createBill } from "@/app/_actions/bills";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
    // If user already has income configured, skip onboarding
    const incomeCount = await prisma.income.count({ where: { isActive: true } });
    if (incomeCount > 0) redirect("/daily");

    return (
        <OnboardingClient
            createIncome={createIncome}
            createBill={createBill}
            createCategory={createCategory}
        />
    );
}

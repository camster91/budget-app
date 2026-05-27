import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { createIncome } from "@/app/_actions/incomes";
import { createCategory } from "@/app/_actions/categories";
import { createBill } from "@/app/_actions/bills";
import { OnboardingClient } from "@/components/onboarding/OnboardingClient";
import { getAuthUser } from "@/lib/getAuthUser";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    // If user already has income configured for their household, skip onboarding
    const incomeCount = await prisma.income.count({ 
        where: { isActive: true, householdId: user.householdId } 
    });
    if (incomeCount > 0) redirect("/daily");

    return (
        <OnboardingClient
            createIncome={createIncome}
            createBill={createBill}
            createCategory={createCategory}
        />
    );
}

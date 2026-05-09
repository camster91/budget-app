import { DailyDashboard } from "@/components/daily/DailyDashboard";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DailyPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const accounts = await prisma.account.findMany({
        where: { householdId: user.householdId }
    });

    const plaidConfigured = Boolean(process.env.PLAID_CLIENT_ID);

    return <DailyDashboard initialAccounts={accounts} plaidConfigured={plaidConfigured} />;
}

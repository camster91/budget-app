import { getTransactions } from "@/app/_actions/transactions";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const { data: transactions } = await getTransactions();

    // In a real app, we'd fetch stats and growth data too.
    // For now, we'll pass the real transactions to the client content.
    return <DashboardContent transactions={transactions || []} />;
}

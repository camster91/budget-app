import { getDashboardSummary } from "@/app/_actions/dashboard";
import { DashboardContent } from "@/components/dashboard/DashboardContent";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const { data } = await getDashboardSummary();

    return <DashboardContent data={data || {
        netWorth: 0,
        monthlyIncome: 0,
        monthlyExpenses: 0,
        savingsRate: 0,
        incomeTrend: "0%",
        chartData: [],
        transactions: [],
        spendingByCategory: [],
        budgetHealth: [],
    }} />;
}

export const dynamic = "force-dynamic";

import { getTransactions } from "@/app/_actions/transactions";
import { TransactionsClient } from "./TransactionsClient";

export default async function TransactionsPage() {
    const { data: transactions } = await getTransactions();

    return <TransactionsClient transactions={transactions || []} />;
}

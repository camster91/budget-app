import { getTransactions } from "@/app/_actions/transactions";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default async function TransactionsPage() {
    const { data: transactions } = await getTransactions();

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Transactions</h2>
                <TransactionForm />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent>
                    {!transactions?.length ? (
                        <div className="text-center text-muted-foreground py-8">
                            No transactions found. Add one to get started.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {transactions.map((t) => (
                                <div key={t.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                                    <div>
                                        <p className="font-medium">{t.description}</p>
                                        <p className="text-sm text-muted-foreground">
                                            {t.category?.name || "Uncategorized"} • {new Date(t.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={`font-bold ${t.type === 'income' ? 'text-green-600' : ''}`}>
                                        {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

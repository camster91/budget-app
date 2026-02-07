import { getBudgets } from "@/app/_actions/budgets";
import { BudgetForm } from "@/components/budgets/BudgetForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default async function BudgetsPage() {
    const { data: budgets } = await getBudgets();

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Budgets</h2>
                <BudgetForm />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {budgets?.map((b) => (
                    <Card key={b.id}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{b.category.name}</CardTitle>
                            <span className="text-xs text-muted-foreground">{b.period}</span>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(b.amount)}</div>
                            <div className="mt-4 h-2 w-full rounded-full bg-secondary">
                                <div className="h-2 w-1/3 rounded-full bg-primary" />
                            </div>
                            <p className="mt-2 text-xs text-muted-foreground">
                                33% used (Placeholder)
                            </p>
                        </CardContent>
                    </Card>
                ))}
                {!budgets?.length && (
                    <div className="col-span-full text-center text-muted-foreground py-10">
                        No budgets set. Create one to track your spending.
                    </div>
                )}
            </div>
        </div>
    );
}

export const dynamic = "force-dynamic";

import { getBudgets } from "@/app/_actions/budgets";
import { BudgetForm } from "@/components/budgets/BudgetForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency, cn } from "@/lib/utils";
import { PiggyBank, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function BudgetsPage() {
    const { data: budgets } = await getBudgets();

    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Budgets</h2>
                    <p className="text-muted-foreground text-sm">Control your spending by category.</p>
                </div>
                <BudgetForm />
            </div>

            {!budgets?.length ? (
                <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-white/[0.1] bg-transparent">
                    <div className="h-16 w-16 rounded-3xl glass flex items-center justify-center mb-6">
                        <PiggyBank className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-white text-lg font-bold mb-2">No budgets set</h3>
                    <p className="text-muted-foreground mb-8 max-w-sm">Setup monthly limits for your expense categories to keep your finances on track.</p>
                    <BudgetForm />
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {budgets.map((b: any) => (
                        <Card key={b.id} className="relative overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <div>
                                    <CardTitle className="text-base font-bold text-white mb-1">{b.category.name}</CardTitle>
                                    <CardDescription className="text-[10px] uppercase font-bold tracking-wider">{b.period}</CardDescription>
                                </div>
                                <div className="p-2 rounded-xl glass text-primary">
                                    <PiggyBank className="h-5 w-5" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-end justify-between mb-4">
                                    <div className="text-3xl font-bold text-white tracking-tight">{formatCurrency(b.amount)}</div>
                                    <div className="text-xs text-muted-foreground font-medium pb-1 flex items-center gap-2">
                                        <div className="h-1 w-1 rounded-full bg-primary" />
                                        Monthly Limit
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                                        <span>Progress</span>
                                        <span className="text-white">{Math.min(Math.round(b.progress || 0), 100)}%</span>
                                    </div>
                                    <div className="h-2 w-full rounded-full bg-white/[0.05] overflow-hidden border border-white/[0.05]">
                                        <div
                                            className={cn(
                                                "h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-500",
                                                (b.progress || 0) > 100 ? "bg-red-500 shadow-red-500/50" : "bg-gradient-to-r from-primary to-violet-500"
                                            )}
                                            style={{ width: `${Math.min(b.progress || 0, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-muted-foreground font-medium pt-1">
                                        <span className={cn((b.progress || 0) > 100 && "text-red-400")}>Spent: {formatCurrency(b.spent || 0)}</span>
                                        <span>Remaining: {formatCurrency(b.remaining || 0)}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    <button className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-primary/50 hover:bg-white/[0.02] transition-all group min-h-[220px]">
                        <PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                        <span className="text-sm font-bold text-muted-foreground group-hover:text-white transition-colors">Create New Budget</span>
                    </button>
                </div>
            )}
        </div>
    );
}

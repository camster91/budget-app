import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function BillsPage() {
    const bills = await prisma.bill.findMany({
        include: { category: true, account: true },
    });

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Upcoming Bills</h2>
            <div className="grid gap-4">
                {bills.map((bill) => (
                    <Card key={bill.id} className="flex flex-row justify-between items-center p-4">
                        <div>
                            <CardTitle>{bill.name}</CardTitle>
                            <p className="text-sm text-muted-foreground">{bill.category.name} • Due Day: {bill.dueDay}</p>
                        </div>
                        <div className="text-2xl font-bold">${bill.amount.toFixed(2)}</div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

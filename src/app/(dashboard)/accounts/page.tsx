import { getAccounts } from "@/app/_actions/accounts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AccountsPage() {
    const accounts = await getAccounts();

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Accounts</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {accounts.map((acc) => (
                    <Card key={acc.id}>
                        <CardHeader>
                            <CardTitle>{acc.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm">Type: {acc.type}</p>
                            <p className="text-2xl font-bold mt-2">${acc.balance.toFixed(2)}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

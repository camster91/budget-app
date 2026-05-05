export const dynamic = 'force-dynamic';

import { redirect } from "next/navigation";
import { getAccounts } from "@/app/_actions/accounts";
import { getAuthUser } from "@/lib/auth";
import { AccountsClient } from "./AccountsClient";
import { PlaidLinker } from "@/components/plaid/PlaidLinker";
import { createLinkToken, exchangePublicToken } from "@/app/_actions/plaid-link";
import { syncPlaidTransactions } from "@/app/_actions/plaid-sync";

export default async function AccountsPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const accounts = await getAccounts();
    return (
        <div className="space-y-8">
            <AccountsClient accounts={accounts} />
            <div className="mt-12 pt-8 border-t border-white/10 max-w-md">
                <PlaidLinker
                    accounts={accounts}
                    createLinkToken={createLinkToken}
                    exchangeToken={exchangePublicToken}
                    syncTransactions={syncPlaidTransactions}
                />
            </div>
        </div>
    );
}
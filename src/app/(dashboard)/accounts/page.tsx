export const dynamic = 'force-dynamic';

import { getAccounts } from "@/app/_actions/accounts";
import { AccountsClient } from "./AccountsClient";

export default async function AccountsPage() {
    const accounts = await getAccounts();
    return <AccountsClient accounts={accounts} />;
}

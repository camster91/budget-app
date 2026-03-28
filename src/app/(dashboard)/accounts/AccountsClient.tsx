"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { CreditCard, Plus, X, Pencil, Check, Building2, Wallet, TrendingUp, PiggyBank, Banknote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createAccount, deleteAccount, updateAccountBalance } from "@/app/_actions/accounts";

interface Account {
    id: string;
    name: string;
    type: string;
    institution: string | null;
    balance: number;
    color: string | null;
    isDefault: boolean;
}

const ACCOUNT_TYPES = [
    { value: "checking", label: "Checking", icon: Wallet },
    { value: "savings", label: "Savings", icon: PiggyBank },
    { value: "credit", label: "Credit Card", icon: CreditCard },
    { value: "investment", label: "Investment", icon: TrendingUp },
    { value: "cash", label: "Cash", icon: Banknote },
];

const TYPE_COLORS: Record<string, string> = {
    checking: "from-blue-500/20 to-blue-600/5 border-blue-500/20",
    savings: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
    credit: "from-rose-500/20 to-rose-600/5 border-rose-500/20",
    investment: "from-violet-500/20 to-violet-600/5 border-violet-500/20",
    cash: "from-amber-500/20 to-amber-600/5 border-amber-500/20",
};

const TYPE_ICON_COLORS: Record<string, string> = {
    checking: "text-blue-400",
    savings: "text-emerald-400",
    credit: "text-rose-400",
    investment: "text-violet-400",
    cash: "text-amber-400",
};

function getTypeIcon(type: string) {
    return ACCOUNT_TYPES.find((t) => t.value === type)?.icon || Wallet;
}

interface AccountsClientProps {
    accounts: Account[];
}

export function AccountsClient({ accounts: initialAccounts }: AccountsClientProps) {
    const router = useRouter();
    const [accounts, setAccounts] = useState(initialAccounts);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editBalance, setEditBalance] = useState("");
    const [isPending, startTransition] = useTransition();

    const netWorth = accounts.reduce((sum, a) => {
        return a.type === "credit" ? sum - a.balance : sum + a.balance;
    }, 0);

    function handleCreate(formData: FormData) {
        startTransition(async () => {
            const result = await createAccount(formData);
            if (result.success) {
                setShowForm(false);
                router.refresh();
            }
        });
    }

    function handleDelete(id: string) {
        startTransition(async () => {
            const result = await deleteAccount(id);
            if (result.success) setAccounts((prev) => prev.filter((a) => a.id !== id));
        });
    }

    function handleUpdateBalance(id: string) {
        const balance = parseFloat(editBalance);
        if (isNaN(balance)) return;
        startTransition(async () => {
            await updateAccountBalance(id, balance);
            setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, balance } : a));
            setEditingId(null);
        });
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Accounts</h2>
                    <p className="text-muted-foreground text-sm">Manage your financial accounts and track balances.</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="text-right hidden md:block">
                        <div className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Net Worth</div>
                        <div className={cn("text-xl font-bold", netWorth >= 0 ? "text-white" : "text-rose-400")}>
                            {formatCurrency(netWorth)}
                        </div>
                    </div>
                    <Button onClick={() => setShowForm(true)} className="gap-2 rounded-xl">
                        <Plus className="h-4 w-4" />
                        Add Account
                    </Button>
                </div>
            </div>

            <AnimatePresence>
                {showForm && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Card className="border-primary/20 bg-primary/5">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                                <CardTitle className="text-base">Add New Account</CardTitle>
                                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent>
                                <form action={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Account Name</label>
                                        <Input name="name" placeholder="e.g. Main Chequing" required className="rounded-xl bg-white/[0.05] border-white/[0.1]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</label>
                                        <select name="type" required className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary">
                                            {ACCOUNT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Institution</label>
                                        <Input name="institution" placeholder="e.g. Tangerine" className="rounded-xl bg-white/[0.05] border-white/[0.1]" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Current Balance</label>
                                        <Input name="balance" type="number" step="0.01" placeholder="0.00" className="rounded-xl bg-white/[0.05] border-white/[0.1]" />
                                    </div>
                                    <div className="flex items-end sm:col-span-2 lg:col-span-2">
                                        <Button type="submit" disabled={isPending} className="w-full rounded-xl">
                                            {isPending ? "Adding..." : "Add Account"}
                                        </Button>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {!accounts.length ? (
                <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-white/[0.1] bg-transparent">
                    <div className="h-16 w-16 rounded-3xl glass flex items-center justify-center mb-6">
                        <Building2 className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-white text-lg font-bold mb-2">No accounts yet</h3>
                    <p className="text-muted-foreground mb-8 max-w-sm">Add your bank and credit card accounts to get a complete financial picture.</p>
                    <Button onClick={() => setShowForm(true)} className="gap-2 rounded-xl">
                        <Plus className="h-4 w-4" />
                        Add First Account
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {accounts.map((acc) => {
                        const TypeIcon = getTypeIcon(acc.type);
                        const colorClass = TYPE_COLORS[acc.type] || TYPE_COLORS.checking;
                        const iconColor = TYPE_ICON_COLORS[acc.type] || "text-primary";
                        const isCredit = acc.type === "credit";

                        return (
                            <motion.div
                                key={acc.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                            >
                                <Card className={cn("relative overflow-hidden group bg-gradient-to-br border", colorClass)}>
                                    <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn("p-2 rounded-xl bg-white/[0.05]", iconColor)}>
                                                <TypeIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-base font-bold text-white">{acc.name}</CardTitle>
                                                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mt-0.5">
                                                    {acc.institution ? `${acc.institution} · ` : ""}{acc.type}
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-400"
                                            onClick={() => handleDelete(acc.id)}
                                            disabled={isPending}
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </Button>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-end justify-between">
                                            <div>
                                                <div className={cn("text-3xl font-bold tracking-tight", isCredit ? "text-rose-400" : "text-white")}>
                                                    {isCredit ? "-" : ""}{formatCurrency(Math.abs(acc.balance))}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-medium mt-1 uppercase tracking-wider">
                                                    {isCredit ? "Outstanding Balance" : "Available Balance"}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-white"
                                                onClick={() => {
                                                    setEditingId(acc.id);
                                                    setEditBalance(String(acc.balance));
                                                }}
                                            >
                                                <Pencil className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>

                                        {editingId === acc.id && (
                                            <div className="flex gap-2 mt-3 pt-3 border-t border-white/[0.05]">
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    value={editBalance}
                                                    onChange={(e) => setEditBalance(e.target.value)}
                                                    placeholder="New balance"
                                                    className="rounded-xl bg-white/[0.05] border-white/[0.1] h-8 text-sm"
                                                />
                                                <Button
                                                    size="icon"
                                                    className="h-8 w-8 rounded-xl shrink-0"
                                                    onClick={() => handleUpdateBalance(acc.id)}
                                                    disabled={isPending}
                                                >
                                                    <Check className="h-3 w-3" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-xl shrink-0"
                                                    onClick={() => setEditingId(null)}
                                                >
                                                    <X className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}

                    <button
                        onClick={() => setShowForm(true)}
                        className="flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-white/[0.1] hover:border-primary/50 hover:bg-white/[0.02] transition-all group min-h-[180px]"
                    >
                        <Plus className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                        <span className="text-sm font-bold text-muted-foreground group-hover:text-white transition-colors">Add Account</span>
                    </button>
                </div>
            )}
        </div>
    );
}

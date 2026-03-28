"use client";

import { useState, useMemo, useTransition } from "react";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { ImportModal } from "@/components/transactions/ImportModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Receipt, Search, Filter, Download, Upload, Pencil, Trash2, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTransaction, deleteTransaction } from "@/app/_actions/transactions";

const PAGE_SIZE = 25;

interface Category {
    id: string;
    name: string;
}

interface Transaction {
    id: string;
    description: string;
    amount: number;
    date: Date | string;
    type: string;
    category: Category | null;
    categoryId: string | null;
}

interface TransactionsClientProps {
    transactions: Transaction[];
    categories: Category[];
}

export function TransactionsClient({ transactions: initialTransactions, categories }: TransactionsClientProps) {
    const [transactions, setTransactions] = useState(initialTransactions);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [typeFilter, setTypeFilter] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Transaction>>({});
    const [page, setPage] = useState(1);
    const [isPending, startTransition] = useTransition();

    const filtered = useMemo(() => {
        return transactions.filter((t) => {
            const matchesSearch = !search || t.description.toLowerCase().includes(search.toLowerCase());
            const matchesCategory = !categoryFilter || t.categoryId === categoryFilter;
            const matchesType = !typeFilter || t.type === typeFilter;
            const tDate = new Date(t.date);
            const matchesFrom = !dateFrom || tDate >= new Date(dateFrom);
            const matchesTo = !dateTo || tDate <= new Date(dateTo + "T23:59:59");
            return matchesSearch && matchesCategory && matchesType && matchesFrom && matchesTo;
        });
    }, [transactions, search, categoryFilter, typeFilter, dateFrom, dateTo]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    function startEdit(t: Transaction) {
        setEditingId(t.id);
        setEditForm({
            description: t.description,
            amount: t.amount,
            date: typeof t.date === "string" ? t.date.slice(0, 10) : t.date.toISOString().slice(0, 10),
            type: t.type,
            categoryId: t.categoryId || "",
        });
    }

    function handleSaveEdit(id: string) {
        const fd = new FormData();
        fd.append("description", editForm.description || "");
        fd.append("amount", String(editForm.amount || 0));
        fd.append("date", String(editForm.date || ""));
        fd.append("type", editForm.type || "expense");
        fd.append("categoryId", editForm.categoryId || "");

        startTransition(async () => {
            const result = await updateTransaction(id, fd);
            if (result.success) {
                setTransactions((prev) =>
                    prev.map((t) =>
                        t.id === id
                            ? {
                                  ...t,
                                  description: editForm.description || t.description,
                                  amount: Number(editForm.amount) || t.amount,
                                  date: editForm.date ? new Date(editForm.date as string) : t.date,
                                  type: editForm.type || t.type,
                                  categoryId: editForm.categoryId || null,
                                  category: categories.find((c) => c.id === editForm.categoryId) || null,
                              }
                            : t
                    )
                );
                setEditingId(null);
            }
        });
    }

    function handleDelete(id: string) {
        startTransition(async () => {
            const result = await deleteTransaction(id);
            if (result.success) {
                setTransactions((prev) => prev.filter((t) => t.id !== id));
            }
        });
    }

    function exportCSV() {
        const header = ["Date", "Description", "Category", "Type", "Amount"];
        const rows = filtered.map((t) => [
            new Date(t.date).toLocaleDateString(),
            `"${t.description.replace(/"/g, '""')}"`,
            t.category?.name || "Uncategorized",
            t.type,
            t.type === "expense" ? `-${t.amount}` : String(t.amount),
        ]);
        const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }

    function resetFilters() {
        setSearch("");
        setCategoryFilter("");
        setTypeFilter("");
        setDateFrom("");
        setDateTo("");
        setPage(1);
    }

    function handleSearchChange(v: string) { setSearch(v); setPage(1); }
    function handleCategoryChange(v: string) { setCategoryFilter(v); setPage(1); }
    function handleTypeChange(v: string) { setTypeFilter(v); setPage(1); }
    function handleDateFromChange(v: string) { setDateFrom(v); setPage(1); }
    function handleDateToChange(v: string) { setDateTo(v); setPage(1); }

    return (
        <>
            <div className="flex flex-col gap-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Transactions</h2>
                        <p className="text-muted-foreground text-sm">Review and manage your financial history.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" className="gap-2" onClick={exportCSV}>
                            <Download className="h-4 w-4" />
                            Export
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => setIsImportModalOpen(true)}
                        >
                            <Upload className="h-4 w-4" />
                            Import
                        </Button>
                        <TransactionForm categories={categories} />
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-4">
                    <Card className="col-span-1">
                        <CardHeader>
                            <CardTitle className="text-sm">Filters</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search..."
                                    className="pl-9 bg-white/[0.02]"
                                    value={search}
                                    onChange={(e) => handleSearchChange(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Category</label>
                                <select
                                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={categoryFilter}
                                    onChange={(e) => handleCategoryChange(e.target.value)}
                                >
                                    <option value="">All Categories</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Type</label>
                                <select
                                    className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                    value={typeFilter}
                                    onChange={(e) => handleTypeChange(e.target.value)}
                                >
                                    <option value="">All Types</option>
                                    <option value="income">Income</option>
                                    <option value="expense">Expense</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Date Range</label>
                                <Input
                                    type="date"
                                    placeholder="From"
                                    value={dateFrom}
                                    onChange={(e) => handleDateFromChange(e.target.value)}
                                    className="bg-white/[0.02] border-white/[0.08] text-sm"
                                />
                                <Input
                                    type="date"
                                    placeholder="To"
                                    value={dateTo}
                                    onChange={(e) => handleDateToChange(e.target.value)}
                                    className="bg-white/[0.02] border-white/[0.08] text-sm"
                                />
                            </div>
                            <Button variant="secondary" className="w-full text-xs h-9" onClick={resetFilters}>
                                Reset Filters
                            </Button>
                            <p className="text-[10px] text-center text-muted-foreground">
                                {filtered.length} of {transactions.length} transactions
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-3">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>History</CardTitle>
                                <CardDescription>
                                    {filtered.length > 0
                                        ? `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`
                                        : "No results"}
                                </CardDescription>
                            </div>
                            <Button variant="ghost" size="icon">
                                <Filter className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {!filtered.length ? (
                                <div className="flex flex-col items-center justify-center py-20 text-center">
                                    <div className="h-12 w-12 rounded-2xl glass flex items-center justify-center mb-4">
                                        <Receipt className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p className="text-white font-medium">No transactions found</p>
                                    <p className="text-sm text-muted-foreground">
                                        {search || categoryFilter || typeFilter
                                            ? "Try adjusting your filters."
                                            : "Add one to start tracking your finances."}
                                    </p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="text-left text-[10px] uppercase text-muted-foreground tracking-[0.2em] border-b border-white/[0.05]">
                                                <th className="pb-4 font-bold">Transaction</th>
                                                <th className="pb-4 font-bold">Category</th>
                                                <th className="pb-4 font-bold">Date</th>
                                                <th className="pb-4 font-bold text-right">Amount</th>
                                                <th className="pb-4 font-bold text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.05]">
                                            {paginated.map((t) =>
                                                editingId === t.id ? (
                                                    <tr key={t.id} className="bg-white/[0.03]">
                                                        <td className="py-3 pr-2">
                                                            <Input
                                                                value={editForm.description || ""}
                                                                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                                                                className="h-8 text-sm bg-white/[0.05] border-white/[0.1] rounded-lg"
                                                            />
                                                        </td>
                                                        <td className="py-3 pr-2">
                                                            <select
                                                                className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                                                                value={editForm.categoryId || ""}
                                                                onChange={(e) => setEditForm((f) => ({ ...f, categoryId: e.target.value }))}
                                                            >
                                                                <option value="">Uncategorized</option>
                                                                {categories.map((c) => (
                                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td className="py-3 pr-2">
                                                            <Input
                                                                type="date"
                                                                value={editForm.date as string || ""}
                                                                onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))}
                                                                className="h-8 text-sm bg-white/[0.05] border-white/[0.1] rounded-lg"
                                                            />
                                                        </td>
                                                        <td className="py-3 pr-2">
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                value={editForm.amount || ""}
                                                                onChange={(e) => setEditForm((f) => ({ ...f, amount: parseFloat(e.target.value) }))}
                                                                className="h-8 text-sm bg-white/[0.05] border-white/[0.1] rounded-lg text-right"
                                                            />
                                                        </td>
                                                        <td className="py-3 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 text-emerald-400 hover:text-emerald-300"
                                                                    onClick={() => handleSaveEdit(t.id)}
                                                                    disabled={isPending}
                                                                >
                                                                    <Check className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7"
                                                                    onClick={() => setEditingId(null)}
                                                                >
                                                                    <X className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    <tr key={t.id} className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-4 font-medium text-white">{t.description}</td>
                                                        <td className="py-4">
                                                            <span className="inline-flex items-center rounded-lg bg-white/[0.05] border border-white/[0.1] px-2 py-1 text-xs font-medium text-muted-foreground">
                                                                {t.category?.name || "Uncategorized"}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 text-sm text-muted-foreground">
                                                            {new Date(t.date).toLocaleDateString(undefined, {
                                                                month: "short",
                                                                day: "numeric",
                                                                year: "numeric",
                                                            })}
                                                        </td>
                                                        <td className={`py-4 text-right font-bold ${t.type === "income" ? "text-emerald-500" : "text-white"}`}>
                                                            {t.type === "expense" ? "-" : "+"}{formatCurrency(t.amount)}
                                                        </td>
                                                        <td className="py-4 text-right">
                                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7"
                                                                    onClick={() => startEdit(t)}
                                                                >
                                                                    <Pencil className="h-3.5 w-3.5" />
                                                                </Button>
                                                                <Button
                                                                    size="icon"
                                                                    variant="ghost"
                                                                    className="h-7 w-7 hover:text-red-400"
                                                                    onClick={() => handleDelete(t.id)}
                                                                    disabled={isPending}
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>

                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between pt-4 border-t border-white/[0.05]">
                                            <p className="text-xs text-muted-foreground">
                                                Page {page} of {totalPages}
                                            </p>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                                    disabled={page === 1}
                                                >
                                                    <ChevronLeft className="h-3.5 w-3.5" />
                                                </Button>
                                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                    const p = totalPages <= 5 ? i + 1 : Math.min(Math.max(page - 2 + i, 1), totalPages - 4 + i);
                                                    return (
                                                        <button
                                                            key={p}
                                                            onClick={() => setPage(p)}
                                                            className={`h-7 w-7 rounded-lg text-xs font-bold transition-colors ${p === page ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-white hover:bg-white/[0.05]"}`}
                                                        >
                                                            {p}
                                                        </button>
                                                    );
                                                })}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7"
                                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                                    disabled={page === totalPages}
                                                >
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <ImportModal open={isImportModalOpen} onOpenChange={setIsImportModalOpen} />
        </>
    );
}

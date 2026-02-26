"use client";

import { useState } from "react";
import { TransactionForm } from "@/components/transactions/TransactionForm";
import { ImportModal } from "@/components/transactions/ImportModal";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Receipt, Search, Filter, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TransactionsClientProps {
  transactions: any[];
}

export function TransactionsClient({ transactions }: TransactionsClientProps) {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Transactions</h2>
            <p className="text-muted-foreground text-sm">Review and manage your financial history.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
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
            <TransactionForm />
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
                <Input placeholder="Search..." className="pl-9 bg-white/[0.02]" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Category</label>
                <select className="w-full bg-white/[0.02] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary">
                  <option value="">All Categories</option>
                  <option value="food">Food</option>
                  <option value="rent">Rent</option>
                </select>
              </div>
              <Button variant="secondary" className="w-full text-xs h-9">Reset Filters</Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>History</CardTitle>
                <CardDescription>A detailed list of your recent flows.</CardDescription>
              </div>
              <Button variant="ghost" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {!transactions?.length ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="h-12 w-12 rounded-2xl glass flex items-center justify-center mb-4">
                    <Receipt className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-white font-medium">No transactions found</p>
                  <p className="text-sm text-muted-foreground">Add one to start tracking your finances.</p>
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
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {transactions.map((t: any) => (
                        <tr key={t.id} className="group hover:bg-white/[0.02] transition-colors">
                          <td className="py-4 font-medium text-white">{t.description}</td>
                          <td className="py-4">
                            <span className="inline-flex items-center rounded-lg bg-white/[0.05] border border-white/[0.1] px-2 py-1 text-xs font-medium text-muted-foreground">
                              {t.category?.name || "Uncategorized"}
                            </span>
                          </td>
                          <td className="py-4 text-sm text-muted-foreground">
                            {new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td className={`py-4 text-right font-bold ${t.type === 'income' ? 'text-emerald-500' : 'text-white'}`}>
                            {t.type === 'expense' ? '-' : '+'}{formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ImportModal 
        open={isImportModalOpen} 
        onOpenChange={setIsImportModalOpen} 
      />
    </>
  );
}
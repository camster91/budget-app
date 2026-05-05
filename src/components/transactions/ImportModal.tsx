"use client";

import { useState, useCallback } from "react";
import { Upload, Loader2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { importCSVTransactions, type CSVRow } from "@/app/_actions/import";
import { formatCurrency, cn } from "@/lib/utils";
import Papa from "papaparse";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories?: { id: string; name: string; color: string | null }[];
}

type ImportStep = "upload" | "preview" | "importing" | "complete";
type FileType = "csv" | "pdf";

interface PreviewTransaction {
    description: string;
    amount: number;
    date: string;
    type: "income" | "expense";
    matchedCategory?: string;
    matchedCategoryId?: string;
    isTransfer: boolean;
}

export function ImportModal({ open, onOpenChange, categories = [] }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>("csv");
  const [bank, setBank] = useState<string>("tangerine");
  const [previewData, setPreviewData] = useState<PreviewTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [importResults, setImportResults] = useState<{ imported: number; errors?: unknown[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({});

  // Keywords for rule-based preview (simplified version of the categorization engine)
  const previewCategorize = useCallback((description: string): { name: string; id: string } | undefined => {
    const desc = description.toLowerCase();
    const rules: [string, string, string][] = [
      // [keyword, categoryName, categoryId placeholder - we'll match by name from categories prop]
      ["starbucks", "Coffee & Snacks", ""],
      ["tim hortons", "Coffee & Snacks", ""],
      ["metro", "Groceries", ""],
      ["walmart", "Groceries", ""],
      ["costco", "Groceries", ""],
      ["amazon", "Shopping", ""],
      ["netflix", "Streaming", ""],
      ["spotify", "Streaming", ""],
      ["uber", "Transport", ""],
      ["shell", "Gas", ""],
      ["mcdonald", "Dining Out", ""],
      ["subway", "Dining Out", ""],
      ["deposit", "Salary", ""],
      ["transfer", "", ""], // transfers filtered out
    ];
    
    for (const [keyword, catName] of rules) {
      if (desc.includes(keyword)) {
        const match = categories.find(c => c.name.toLowerCase().includes(catName.toLowerCase()));
        if (match) return { name: match.name, id: match.id };
        if (catName === "") return undefined; // This is a transfer keyword
      }
    }
    return undefined;
  }, [categories]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setCategoryOverrides({});

    const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.endsWith(".pdf");
    setFileType(isPdf ? "pdf" : "csv");

    if (isPdf) {
      setStep("preview");
      setPreviewData([{ description: "PDF Statement", amount: 0, date: "", type: "expense", isTransfer: false }]);
      return;
    }

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<CSVRow>) => {
        if (results.errors.length > 0) {
          setError(`CSV parse error: ${results.errors[0].message}`);
          return;
        }
        
        // Build preview with categorization
        const parsed: PreviewTransaction[] = results.data.slice(0, 20).map((row) => {
          const description = row['Description'] || row['description'] || '';
          const amount = parseFloat(String(row['Amount'] || row['amount'] || '0'));
          const dateStr = row['Date'] || row['date'] || '';
          const descLower = description.toLowerCase();
          const isTransfer = ['transfer', 'payment to', 'debit', 'credit'].some(k => descLower.includes(k));
          const type = row['Type'] || row['type'] || (amount > 0 ? 'income' : 'expense');
          
          const matched = previewCategorize(description);
          
          return {
            description,
            amount: Math.abs(amount),
            date: dateStr,
            type: type.toLowerCase() === 'income' ? 'income' : 'expense',
            matchedCategory: matched?.name,
            matchedCategoryId: matched?.id,
            isTransfer,
          };
        });
        
        setPreviewData(parsed);
        setAllTransactions(results.data);
        setStep("preview");
      },
    });
  }, [previewCategorize]);

  const handleImport = async () => {
    if (!file) return;
    setStep("importing");

    try {
      let results: any[];

      if (fileType === "pdf") {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("bank", bank);

        const response = await fetch("/api/import/pdf", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to parse PDF");
        }

        const data = await response.json();
        results = data.transactions;
      } else {
        results = await new Promise<CSVRow[]>((resolve) => {
          Papa.parse(file, {
            header: true,
            complete: (results) => resolve(results.data as CSVRow[]),
          });
        });
        
        // Apply category overrides
        results = results.map((row, i) => ({
          ...row,
          categoryId: categoryOverrides[i] || undefined,
        }));
      }

      const result = await importCSVTransactions(results, { skipTransfers: true, autoCategorize: !Object.keys(categoryOverrides).length });
      
      if (result.success) {
        setImportResults({ imported: result.imported || 0, errors: result.errors });
        setStep("complete");
      } else {
        setError(result.error || "Failed to import");
      }
    } catch {
      setError("Failed to import transactions");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep("upload");
    setFile(null);
    setPreviewData([]);
    setAllTransactions([]);
    setImportResults(null);
    setError(null);
    setCategoryOverrides({});
  };

  // Stats for preview
  const categorized = previewData.filter(t => t.matchedCategory && !t.isTransfer).length;
  const transfers = previewData.filter(t => t.isTransfer).length;
  const uncategorized = previewData.filter(t => !t.matchedCategory && !t.isTransfer).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
          <DialogDescription>
            Upload your bank statement to import transactions with auto-categorization.
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Select Bank</label>
              <select 
                value={bank} 
                onChange={(e) => setBank(e.target.value)}
                className="w-full p-2 bg-background border rounded-md text-sm"
              >
                <option value="tangerine">Tangerine</option>
                <option value="generic">Generic (CSV only)</option>
              </select>
            </div>
            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg">
              <input type="file" onChange={handleFileSelect} accept=".csv,.pdf" className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm">Click to upload CSV or PDF</span>
              </label>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            {/* Stats bar */}
            <div className="flex gap-3 text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                <Check className="h-3 w-3" />
                {categorized} auto-categorized
              </div>
              {transfers > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                  <AlertCircle className="h-3 w-3" />
                  {transfers} transfers (excluded)
                </div>
              )}
              {uncategorized > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-muted-foreground font-medium">
                  {uncategorized} uncategorized
                </div>
              )}
            </div>

            {/* Preview table */}
            <div className="border rounded-lg overflow-hidden">
              <div className="max-h-[300px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-background border-b">
                    <tr>
                      <th className="text-left p-2 font-medium text-muted-foreground">Description</th>
                      <th className="text-right p-2 font-medium text-muted-foreground">Amount</th>
                      <th className="p-2 font-medium text-muted-foreground text-center">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {previewData.map((row, i) => (
                      <tr key={i} className={cn(row.isTransfer && "opacity-40")}>
                        <td className="p-2 truncate max-w-[200px]" title={row.description}>
                          {row.description}
                        </td>
                        <td className={cn("p-2 text-right font-medium", row.type === "income" ? "text-emerald-400" : "text-white")}>
                          {row.type === "expense" ? "-" : "+"}{formatCurrency(row.amount)}
                        </td>
                        <td className="p-2">
                          {row.isTransfer ? (
                            <span className="text-[10px] text-amber-500">Transfer</span>
                          ) : row.matchedCategory ? (
                            <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-medium">
                              {row.matchedCategory}
                            </span>
                          ) : (
                            <select
                              className="w-full bg-white/[0.05] border border-white/[0.1] rounded px-1.5 py-0.5 text-[10px] text-white"
                              value={categoryOverrides[i] || ""}
                              onChange={(e) => {
                                if (e.target.value) {
                                  setCategoryOverrides(prev => ({ ...prev, [i]: e.target.value }));
                                } else {
                                  const next = { ...categoryOverrides };
                                  delete next[i];
                                  setCategoryOverrides(next);
                                }
                              }}
                            >
                              <option value="">— uncategorized —</option>
                              {categories
                                .filter(c => c.name.toLowerCase() !== 'income')
                                .map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.length >= 20 && (
                <div className="p-2 text-center text-xs text-muted-foreground border-t">
                  Showing first 20 of {allTransactions.length} transactions
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} className="flex-1">
                Import {allTransactions.length} Transactions
              </Button>
              <Button variant="outline" onClick={() => setStep("upload")}>
                Back
              </Button>
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>Importing transactions...</p>
          </div>
        )}

        {step === "complete" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Check className="h-8 w-8 text-emerald-500" />
            <p className="text-lg font-bold text-white">Imported {importResults?.imported} transactions!</p>
            {importResults?.errors && importResults.errors.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {importResults.errors.length} rows skipped due to errors
              </p>
            )}
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
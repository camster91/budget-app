"use client";

import { useState, useCallback } from "react";
import { Upload, Loader2, Check, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { importCSVTransactions, type CSVRow } from "@/app/_actions/import";
import { formatCurrency, cn } from "@/lib/utils";
import Papa from "papaparse";
import { toast } from "sonner";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories?: { id: string; name: string; color: string | null }[];
}

type ImportStep = "upload" | "parsing" | "preview" | "importing" | "complete";
type FileType = "csv" | "pdf";
type BankType = "tangerine" | "generic";

interface PreviewTransaction {
  description: string;
  amount: number;
  date: string;
  type: "income" | "expense";
  matchedCategory?: string;
  matchedCategoryId?: string;
  isTransfer: boolean;
}

// Keywords → category name matching (matched against existing categories prop)
const KEYWORD_RULES: [string, string][] = [
  ["starbucks", "Coffee"],
  ["tim hortons", "Coffee"],
  ["second cup", "Coffee"],
  ["mcdonald", "Dining"],
  ["subway", "Dining"],
  ["wendys", "Dining"],
  ["kfc", "Dining"],
  ["burger king", "Dining"],
  ["dominos", "Dining"],
  ["pizza", "Dining"],
  ["metro", "Groceries"],
  ["walmart", "Groceries"],
  ["costco", "Groceries"],
  ["loblaws", "Groceries"],
  ["no frills", "Groceries"],
  ["shopify", "Groceries"],
  ["fortinos", "Groceries"],
  ["sobeys", "Groceries"],
  ["safeway", "Groceries"],
  ["amazon", "Shopping"],
  ["ebay", "Shopping"],
  ["canadian tire", "Shopping"],
  ["best buy", "Shopping"],
  ["shoppers", "Health"],
  ["rexall", "Health"],
  ["uber", "Transport"],
  ["lyft", "Transport"],
  ["go station", "Transport"],
  ["go bus", "Transport"],
  ["shell", "Gas"],
  ["esso", "Gas"],
  ["petro-canada", "Gas"],
  ["netflix", "Streaming"],
  ["spotify", "Streaming"],
  ["disney+", "Streaming"],
  ["apple tv", "Streaming"],
  ["youtube", "Streaming"],
  ["hulu", "Streaming"],
  ["deposit", "Income"],
  ["payroll", "Income"],
  ["etransfer received", "Income"],
  ["etransfer-in", "Income"],
];

function previewCategorize(description: string, categories: { name: string }[]): string | undefined {
  const desc = description.toLowerCase();
  for (const [keyword, catName] of KEYWORD_RULES) {
    if (desc.includes(keyword)) {
      // Try exact match first
      const match = categories.find(c => c.name.toLowerCase().includes(catName.toLowerCase()));
      if (match) return match.name;
      // Fallback: any category containing the keyword
      const fuzzy = categories.find(c => c.name.toLowerCase().includes(keyword));
      if (fuzzy) return fuzzy.name;
    }
  }
  return undefined;
}

export function ImportModal({ open, onOpenChange, categories = [] }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<FileType>("csv");
  const [bank, setBank] = useState<BankType>("tangerine");
  const [previewData, setPreviewData] = useState<PreviewTransaction[]>([]);
  const [allTransactions, setAllTransactions] = useState<CSVRow[]>([]);
  const [importResults, setImportResults] = useState<{ imported: number; errors?: unknown[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<number, string>>({});

  // Reset state when modal opens
  const handleOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setStep("upload");
      setFile(null);
      setPreviewData([]);
      setAllTransactions([]);
      setImportResults(null);
      setError(null);
      setCategoryOverrides({});
    }
    onOpenChange(open);
  }, [onOpenChange]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");
    setFileType(isPdf ? "pdf" : "csv");

    if (isPdf) {
      // For PDF: immediately parse via API, then show preview
      setStep("parsing");
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
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
        const txs: CSVRow[] = data.transactions || [];

        if (txs.length === 0) {
          throw new Error("No transactions found in PDF. Make sure you're uploading a Tangerine statement.");
        }

        setAllTransactions(txs);

        // Build preview
        const parsed: PreviewTransaction[] = txs.map((row) => {
          const description = String(row["Description"] || row["description"] || "");
          const amount = parseFloat(String(row["Amount"] || row["amount"] || "0"));
          const dateStr = String(row["Date"] || row["date"] || "");
          const descLower = description.toLowerCase();
          const isTransfer = ["transfer", "payment to", "interac"].some(k => descLower.includes(k));
          const type = amount > 0 ? "income" : "expense";
          const matched = previewCategorize(description, categories);

          return {
            description,
            amount: Math.abs(amount),
            date: dateStr,
            type: type as "income" | "expense",
            matchedCategory: matched,
            isTransfer,
          };
        });

        setPreviewData(parsed);
        setStep("preview");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to parse PDF");
        setStep("upload");
      }
      return;
    }

    // CSV: parse locally and show preview
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<CSVRow>) => {
        if (results.errors.length > 0) {
          setError(`CSV parse error: ${results.errors[0].message}`);
          return;
        }

        const txs = results.data;
        if (txs.length === 0) {
          setError("CSV file is empty");
          return;
        }

        setAllTransactions(txs);

        const parsed: PreviewTransaction[] = txs.map((row) => {
          const description = String(row["Description"] || row["description"] || "");
          const amount = parseFloat(String(row["Amount"] || row["amount"] || "0"));
          const dateStr = String(row["Date"] || row["date"] || "");
          const descLower = description.toLowerCase();
          const isTransfer = ["transfer", "payment to", "interac"].some(k => descLower.includes(k));
          const type = amount > 0 ? "income" : "expense";
          const matched = previewCategorize(description, categories);

          return {
            description,
            amount: Math.abs(amount),
            date: dateStr,
            type: type as "income" | "expense",
            matchedCategory: matched,
            isTransfer,
          };
        });

        setPreviewData(parsed);
        setStep("preview");
      },
    });
  }, [categories, bank]);

  const handleImport = async () => {
    if (!file || allTransactions.length === 0) return;
    setStep("importing");

    try {
      // Apply category overrides
      const transactionsToImport = allTransactions.map((row, i) => ({
        ...row,
        categoryId: categoryOverrides[i] || undefined,
      }));

      const result = await importCSVTransactions(transactionsToImport, {
        skipTransfers: true,
        autoCategorize: Object.keys(categoryOverrides).length === 0,
      });

      if (result.success) {
        setImportResults({ imported: result.imported || 0, errors: result.errors });
        toast.success(`Imported ${result.imported} transactions`);
        setStep("complete");
      } else {
        setError(result.error || "Failed to import");
        setStep("preview");
      }
    } catch {
      setError("Failed to import transactions");
      setStep("preview");
    }
  };

  const handleClose = () => handleOpenChange(false);

  // Stats for preview
  const categorized = previewData.filter(t => t.matchedCategory && !t.isTransfer).length;
  const transfers = previewData.filter(t => t.isTransfer).length;
  const uncategorized = previewData.filter(t => !t.matchedCategory && !t.isTransfer).length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[680px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import Transactions
          </DialogTitle>
          <DialogDescription>
            Upload a CSV or PDF bank statement. Transfers are auto-excluded.
          </DialogDescription>
        </DialogHeader>

        {/* STEP: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            {/* Bank selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Bank / Format</label>
              <select
                value={bank}
                onChange={(e) => setBank(e.target.value as BankType)}
                className="w-full p-2.5 bg-white/[0.04] border border-white/[0.1] rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="tangerine">Tangerine (PDF + CSV)</option>
                <option value="generic">Generic Bank (CSV only)</option>
              </select>
            </div>

            {/* File drop zone */}
            <div className="relative">
              <input
                type="file"
                onChange={handleFileSelect}
                accept={bank === "generic" ? ".csv" : ".csv,.pdf"}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-white/[0.15] rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/[0.03] transition-all"
              >
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white">Click to upload</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {bank === "tangerine" ? "CSV or PDF" : "CSV"} — max 10MB
                  </p>
                </div>
              </label>
            </div>

            {/* Format hints */}
            <div className="bg-white/[0.03] rounded-xl p-3 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Supported formats</p>
              <div className="flex items-start gap-2">
                <FileText className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-white">Tangerine PDF</span> — Download your statement as PDF from Tangerine online banking. Auto-parsed with merchant rules.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-white">Generic CSV</span> — Columns: Date, Description, Amount (any order)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP: Parsing PDF */}
        {step === "parsing" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white">Parsing PDF...</p>
              <p className="text-xs text-muted-foreground mt-1">Extracting transactions from your bank statement</p>
            </div>
          </div>
        )}

        {/* STEP: Preview */}
        {step === "preview" && (
          <div className="space-y-4">
            {/* File badge + stats */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">{file?.name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground">
                  {fileType.toUpperCase()}
                </span>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setStep("upload")}>
                Change file
              </Button>
            </div>

            {/* Stats pills */}
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                <Check className="h-3 w-3" />
                {categorized} auto-categorized
              </div>
              {transfers > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
                  <AlertCircle className="h-3 w-3" />
                  {transfers} transfers excluded
                </div>
              )}
              {uncategorized > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.08] text-muted-foreground text-xs font-medium">
                  {uncategorized} uncategorized
                </div>
              )}
            </div>

            {/* Preview table */}
            <div className="border border-white/[0.08] rounded-xl overflow-hidden">
              <div className="max-h-[320px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-zinc-950/90 backdrop-blur-sm border-b border-white/[0.06]">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">Description</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-center p-3 font-medium text-muted-foreground">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {previewData.map((row, i) => (
                      <tr key={i} className={cn("hover:bg-white/[0.02] transition-colors", row.isTransfer && "opacity-40")}>
                        <td className="p-3">
                          <p className="text-white/80 truncate max-w-[220px]" title={row.description}>
                            {row.description}
                          </p>
                          {row.date && <p className="text-[10px] text-muted-foreground mt-0.5">{row.date}</p>}
                        </td>
                        <td className={cn("p-3 text-right font-bold tabular-nums", row.type === "income" ? "text-emerald-400" : "text-white")}>
                          {row.type === "expense" ? "-" : "+"}{formatCurrency(row.amount)}
                        </td>
                        <td className="p-3">
                          {row.isTransfer ? (
                            <span className="text-[10px] text-amber-500 font-medium">Transfer</span>
                          ) : row.matchedCategory ? (
                            <span className="px-2 py-1 rounded-lg bg-primary/15 text-primary text-[10px] font-bold">
                              {row.matchedCategory}
                            </span>
                          ) : (
                            <select
                              className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1 text-[10px] text-white"
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
                              <option value="">— skip —</option>
                              {categories
                                .filter(c => c.name.toLowerCase() !== "income")
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
              {allTransactions.length > previewData.length && (
                <div className="p-3 text-center text-xs text-muted-foreground border-t border-white/[0.06]">
                  Showing first {previewData.length} of {allTransactions.length} transactions
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleImport}
                className="flex-1 rounded-xl h-11 font-medium"
                disabled={allTransactions.length === 0}
              >
                Import {allTransactions.length} Transactions
              </Button>
            </div>
          </div>
        )}

        {/* STEP: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium text-white">Saving transactions...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a moment for large files</p>
            </div>
          </div>
        )}

        {/* STEP: Complete */}
        {step === "complete" && (
          <div className="flex flex-col items-center gap-5 py-10">
            <div className="h-16 w-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-white">
                {importResults?.imported} transactions imported!
              </p>
              {importResults?.errors && importResults.errors.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {importResults.errors.length} rows skipped due to errors
                </p>
              )}
            </div>
            <Button onClick={handleClose} className="w-full rounded-xl h-11 font-medium">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
"use client";

import { useState, useCallback } from "react";
import { Upload, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { importCSVTransactions, type CSVRow } from "@/app/_actions/import";
import Papa from "papaparse";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = "upload" | "preview" | "importing" | "complete";

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<CSVRow[]>([]);
  const [importResults, setImportResults] = useState<{ imported: number; errors?: unknown[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<CSVRow>) => {
        if (results.errors.length > 0) {
          setError(`CSV parse error: ${results.errors[0].message}`);
          return;
        }
        setPreviewData(results.data.slice(0, 5));
        setStep("preview");
      },
    });
  }, []);

  const handleImport = async () => {
    if (!file) return;
    setIsLoading(true);
    setStep("importing");

    try {
      const results = await new Promise<CSVRow[]>((resolve) => {
        Papa.parse(file, {
          header: true,
          complete: (results) => resolve(results.data as CSVRow[]),
        });
      });

      const result = await importCSVTransactions(results, { skipTransfers: true, autoCategorize: true });
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
    setImportResults(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Import Transactions</DialogTitle>
          <DialogDescription>Upload your bank statement CSV file to get started.</DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg">
            <input type="file" onChange={handleFileSelect} accept=".csv" className="hidden" id="csv-upload" />
            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm">Click to upload CSV</span>
            </label>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <h4 className="font-medium text-sm">Preview</h4>
            <div className="text-xs text-muted-foreground space-y-2">
              {previewData.map((row, i) => (
                <div key={i} className="flex gap-2">
                  <span>{row.Description || row.description}</span>
                  <span>{row.Amount || row.amount}</span>
                </div>
              ))}
            </div>
            <Button onClick={handleImport} className="w-full">Import</Button>
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
            <p>Imported {importResults?.imported} transactions!</p>
            <Button onClick={handleClose} className="w-full">Done</Button>
          </div>
        )}

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}

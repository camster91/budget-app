"use client";

import { useState, useCallback } from "react";
import { Upload, FileUp, X, Check, AlertCircle, Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { importCSVTransactions, type CSVRow } from "@/app/_actions/import";
import Papa, { ParseResult } from "papaparse";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = "upload" | "preview" | "importing" | "complete";

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<CSVRow[]>([]);
  const [importOptions, setImportOptions] = useState({
    skipTransfers: true,
    autoCategorize: true,
    hasHeaders: true,
  });
  const [importResults, setImportResults] = useState<{
    imported: number;
    errors?: Array<{ row: number; error: string; field?: string; value?: any }>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    // Parse CSV for preview
    Papa.parse(selectedFile, {
      header: importOptions.hasHeaders,
      skipEmptyLines: true,
      complete: (results: Papa.ParseResult<any>) => {
        if (results.errors.length > 0) {
          setError(`CSV parse error: ${results.errors[0].message}`);
          return;
        }

        const data = results.data as CSVRow[];
        if (data.length === 0) {
          setError("CSV file is empty");
          return;
        }

        setPreviewData(data.slice(0, 10)); // Preview first 10 rows
        setStep("preview");
      },
      error: (error: Error) => {
        setError(`Failed to parse CSV: ${error.message}`);
      },
    });
  }, [importOptions.hasHeaders]);

  const handleImport = async () => {
    if (!file || previewData.length === 0) return;

    setIsLoading(true);
    setStep("importing");

    try {
      // Parse full file
      const fullData = await new Promise<CSVRow[]>((resolve, reject) => {
        Papa.parse(file, {
          header: importOptions.hasHeaders,
          skipEmptyLines: true,
          complete: (results: Papa.ParseResult<any>) => {
            if (results.errors.length > 0) {
              reject(new Error(`CSV parse error: ${results.errors[0].message}`));
              return;
            }
            resolve(results.data as CSVRow[]);
          },
          error: (error: Error) => {
            reject(error);
          },
        });
      });

      // Import transactions
      const result = await importCSVTransactions(fullData, {
        skipTransfers: importOptions.skipTransfers,
        autoCategorize: importOptions.autoCategorize,
      });

      if (result.success) {
        setImportResults({
          imported: result.imported || 0,
          errors: result.errors,
        });
        setStep("complete");
      } else {
        setError(result.error || "Failed to import transactions");
        setStep("preview");
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error occurred");
      setStep("preview");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setPreviewData([]);
    setImportResults(null);
    setError(null);
    setStep("upload");
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleStartOver = () => {
    resetForm();
  };

  const getColumnMapping = (row: CSVRow) => {
    const keys = Object.keys(row);
    if (keys.length === 0) return null;

    // Try to guess column mapping
    const mapping: Record<string, string> = {};
    
    keys.forEach((key) => {
      const value = String(row[key]).toLowerCase();
      if (value.includes("date") || /^\d{1,2}[/-]\d{1,2}[/-]\d{4}/.test(value)) {
        mapping.date = key;
      } else if (value.includes("desc") || value.includes("memo") || value.includes("detail")) {
        mapping.description = key;
      } else if (value.includes("amount") || value.includes("debit") || value.includes("credit")) {
        mapping.amount = key;
      } else if (value.includes("type") || value.includes("category")) {
        mapping.category = key;
      }
    });

    return mapping;
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl glass flex items-center justify-center mb-4">
          <Upload className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-bold text-white">Import Transactions</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a CSV file from your bank statement
        </p>
      </div>

      <div className="space-y-4">
        <div
          className={cn(
            "border-2 border-dashed border-white/[0.1] rounded-2xl p-8 text-center cursor-pointer",
            "hover:border-primary/50 hover:bg-white/[0.02] transition-colors"
          )}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          <FileUp className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-white font-medium mb-1">Drop your CSV file here</p>
          <p className="text-sm text-muted-foreground">or click to browse</p>
          <p className="text-xs text-muted-foreground mt-2">
            Supported: Tangerine, RBC, TD, Scotiabank CSV exports
          </p>
        </div>
        <input
          id="file-upload"
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-muted-foreground">Skip transfers between accounts</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-muted-foreground">Auto-categorize transactions</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500" />
            <span className="text-sm text-muted-foreground">Detect CSV headers automatically</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderPreviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl glass flex items-center justify-center">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Preview Import</h3>
          <p className="text-sm text-muted-foreground">
            {previewData.length} transactions found in {file?.name}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.02] border-b border-white/[0.08]">
                <tr>
                  {previewData[0] && Object.keys(previewData[0]).map((key) => (
                    <th key={key} className="text-left p-3 text-xs font-bold text-muted-foreground uppercase">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(0, 5).map((row, index) => (
                  <tr key={index} className="border-b border-white/[0.05] last:border-0">
                    {Object.values(row).map((value, cellIndex) => (
                      <td key={cellIndex} className="p-3 text-white">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewData.length > 5 && (
            <div className="p-3 text-center text-xs text-muted-foreground bg-white/[0.02]">
              Showing 5 of {previewData.length} rows
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">Skip transfer transactions</label>
            <input
              type="checkbox"
              checked={importOptions.skipTransfers}
              onChange={(e) =>
                setImportOptions((prev) => ({
                  ...prev,
                  skipTransfers: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-white/[0.2] bg-white/[0.05] text-primary focus:ring-primary"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">Auto-categorize transactions</label>
            <input
              type="checkbox"
              checked={importOptions.autoCategorize}
              onChange={(e) =>
                setImportOptions((prev) => ({
                  ...prev,
                  autoCategorize: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-white/[0.2] bg-white/[0.05] text-primary focus:ring-primary"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white">CSV has headers</label>
            <input
              type="checkbox"
              checked={importOptions.hasHeaders}
              onChange={(e) =>
                setImportOptions((prev) => ({
                  ...prev,
                  hasHeaders: e.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-white/[0.2] bg-white/[0.05] text-primary focus:ring-primary"
            />
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handleStartOver}
          className="flex-1"
        >
          Start Over
        </Button>
        <Button
          onClick={handleImport}
          className="flex-1 gap-2"
        >
          <Upload className="h-4 w-4" />
          Import Transactions
        </Button>
      </div>
    </div>
  );

  const renderImportingStep = () => (
    <div className="space-y-6 text-center">
      <div className="mx-auto h-16 w-16 rounded-2xl glass flex items-center justify-center mb-4">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
      <h3 className="text-lg font-bold text-white">Importing Transactions</h3>
      <p className="text-sm text-muted-foreground">
        Processing your transactions...
      </p>
      <div className="w-full bg-white/[0.05] rounded-full h-2 overflow-hidden">
        <div className="bg-primary h-full animate-pulse w-3/4"></div>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4">
          <Check className="h-8 w-8 text-emerald-500" />
        </div>
        <h3 className="text-lg font-bold text-white">Import Complete!</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Successfully imported {importResults?.imported || 0} transactions
        </p>
      </div>

      {importResults?.errors && importResults.errors.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-300">
                {importResults.errors?.length || 0} errors occurred
              </p>
              <p className="text-xs text-amber-500/80">
                Some transactions couldn't be imported. Check the console for details.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Button
          onClick={() => {
            resetForm();
            onOpenChange(false);
            // Refresh the page to show new transactions
            window.location.reload();
          }}
          className="w-full gap-2"
        >
          <Check className="h-4 w-4" />
          View Transactions
        </Button>
        <Button
          variant="outline"
          onClick={handleStartOver}
          className="w-full"
        >
          Import Another File
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <div className="p-1">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">
            {step === "upload" && "Import Transactions"}
            {step === "preview" && "Preview Import"}
            {step === "importing" && "Importing..."}
            {step === "complete" && "Import Complete"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Upload a CSV file from your bank"}
            {step === "preview" && "Review and configure import settings"}
            {step === "importing" && "Please wait while we process your transactions"}
            {step === "complete" && "Your transactions have been imported"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-red-300">Import Error</p>
                <p className="text-xs text-red-500/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          {step === "upload" && renderUploadStep()}
          {step === "preview" && renderPreviewStep()}
          {step === "importing" && renderImportingStep()}
          {step === "complete" && renderCompleteStep()}
        </div>
      </div>
    </Dialog>
  );
}
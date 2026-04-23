"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, Check, Receipt, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseReceiptImage, isOcrSupported } from "@/lib/ocr";
import { formatCurrency } from "@/lib/utils";

interface ReceiptUploaderProps {
    pendingReceipts: {
        id: string;
        imageUrl: string;
        rawAmount: number | null;
        rawMerchant: string | null;
        rawDate: Date | null;
        confidence: number | null;
        status: string;
    }[];
    onApprove: (id: string, overrides?: { amount?: number; merchant?: string; date?: Date; categoryId?: string }) => Promise<void>;
    onReject: (id: string) => Promise<void>;
    onParsed: (parsed: { rawText: string; total?: number; merchant?: string; date?: string; confidence: number }) => Promise<void>;
}

export function ReceiptUploader({ pendingReceipts, onApprove, onReject, onParsed }: ReceiptUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [parseError, setParseError] = useState<string | null>(null);
    const [parseResult, setParseResult] = useState<{ total?: number; merchant?: string; date?: string; confidence: number } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [rawFile, setRawFile] = useState<File | null>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
    const handleDragLeave = useCallback(() => setIsDragging(false), []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault(); setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) await processFile(file);
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await processFile(file);
    };

    async function processFile(file: File) {
        setParseError(null);
        setParseResult(null);
        setRawFile(file);
        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
    }

    async function handleParse() {
        if (!rawFile) return;
        if (!isOcrSupported()) { setParseError("Your browser doesn't support OCR. Try Chrome or Firefox."); return; }
        setIsParsing(true);
        setParseError(null);
        try {
            const result = await parseReceiptImage(rawFile);
            setParseResult({
                total: result.total,
                merchant: result.merchant,
                date: result.date,
                confidence: result.confidence,
            });
            await onParsed({ rawText: result.rawText, total: result.total, merchant: result.merchant, date: result.date, confidence: result.confidence });
        } catch (err) {
            setParseError(err instanceof Error ? err.message : "OCR failed");
        } finally {
            setIsParsing(false);
        }
    }

    function reset() {
        setPreview(null);
        setRawFile(null);
        setParseResult(null);
        setParseError(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    return (
        <div className="space-y-4">
            <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                onClick={() => !isParsing && fileInputRef.current?.click()}
                className={`relative cursor-pointer glass-card rounded-2xl p-6 text-center transition-all duration-300 border-dashed border-2 ${
                    isDragging ? "border-primary/50 bg-primary/5" : isParsing ? "border-white/[0.04] opacity-60" : "border-white/[0.08]"
                }`}>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
                {preview ? (
                    <div className="relative">
                        <img src={preview} alt="Receipt preview" className="mx-auto max-h-48 rounded-lg" />
                        {!isParsing && (
                            <button onClick={(e) => { e.stopPropagation(); reset(); }}
                                className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white hover:bg-black/80">
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Camera className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p className="text-sm font-medium text-white/70">Drop a receipt or tap to upload</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG. OCR runs in your browser — privacy first.</p>
                    </div>
                )}
                {isParsing && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 rounded-2xl">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground mt-2">Reading receipt...</p>
                    </div>
                )}
            </div>

            {parseError && (
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" /> {parseError}
                </div>
            )}

            {parseResult && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white/90">Parsed Result</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary">{Math.round(parseResult.confidence * 100)}% confidence</span>
                    </div>
                    {parseResult.merchant && <div className="text-sm"><span className="text-muted-foreground">Merchant:</span> {parseResult.merchant}</div>}
                    {parseResult.total && <div className="text-sm"><span className="text-muted-foreground">Total:</span> <strong className="text-emerald-400">{formatCurrency(parseResult.total)}</strong></div>}
                    {parseResult.date && <div className="text-sm"><span className="text-muted-foreground">Date:</span> {parseResult.date}</div>}
                    <Button onClick={reset} variant="ghost" size="sm">Dismiss</Button>
                </motion.div>
            )}

            {preview && !parseResult && !isParsing && (
                <div className="flex gap-2">
                    <Button onClick={handleParse} variant="gradient" disabled={isParsing} className="flex-1">Parse Receipt</Button>
                    <Button variant="ghost" onClick={reset}>Cancel</Button>
                </div>
            )}

            {/* Pending receipts queue */}
            <AnimatePresence>
                {pendingReceipts.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                        className="glass-card rounded-2xl overflow-hidden">
                        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-white/90 flex items-center gap-2">
                                <Receipt className="h-4 w-4 text-primary" /> Pending Receipts
                            </h3>
                            <span className="text-xs text-muted-foreground">{pendingReceipts.length}</span>
                        </div>
                        <div className="divide-y divide-white/[0.04]">
                            {pendingReceipts.map((receipt) => (
                                <div key={receipt.id} className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-white/90">{receipt.rawMerchant || "Unknown merchant"}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {receipt.rawAmount ? formatCurrency(receipt.rawAmount) : "Unknown"}
                                            {receipt.rawDate && ` · ${new Date(receipt.rawDate).toLocaleDateString()}`}
                                            {receipt.confidence && ` · ${Math.round(receipt.confidence * 100)}% confidence`}
                                        </p>
                                    </div>
                                    <div className="flex gap-1">
                                        <button onClick={() => onApprove(receipt.id)}
                                            className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                                            <Check className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => onReject(receipt.id)}
                                            className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

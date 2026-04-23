"use client";

// Client-side OCR using Tesseract.js
// Uses dynamic import so the heavy wasm doesn't block initial load

export interface OcrResult {
    rawText: string;
    confidence: number;
    total?: number;
    merchant?: string;
    date?: string;
}

const TOTAL_RE = /(?:total|sum|grand|amount)[\s:]*[$]?[\s]*([\d,]+\.\d{2}|\d+\.\d{2}|\d+)/i;
const AMOUNT_RE = /[$]?[\s]*([\d,]+\.\d{2})\s*$/m;
const DATE_RE = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
const MERCHANT_RE = /^[A-Z][A-Z\s&]{2,40}$/m;

export async function parseReceiptImage(imageFile: File): Promise<OcrResult> {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const ret = await worker.recognize(imageFile);
    await worker.terminate();

    const rawText = ret.data.text;
    const confidence = ret.data.confidence;

    let total: number | undefined;
    const totalMatch = rawText.match(TOTAL_RE);
    if (totalMatch) {
        total = parseFloat(totalMatch[1].replace(",", ""));
    } else {
        const lines = rawText.split("\n").reverse();
        for (const line of lines) {
            const m = line.match(AMOUNT_RE);
            if (m) { total = parseFloat(m[1].replace(",", "")); break; }
        }
    }

    let date: string | undefined;
    const dateMatch = rawText.match(DATE_RE);
    if (dateMatch) {
        const [, m, d, y] = dateMatch;
        const year = y.length === 2 ? `20${y}` : y;
        date = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }

    let merchant: string | undefined;
    const merchantMatch = rawText.match(MERCHANT_RE);
    if (merchantMatch) merchant = merchantMatch[0].trim();
    else {
        const firstLine = rawText.split("\n").find((l) => l.trim().length > 2);
        if (firstLine) merchant = firstLine.trim();
    }

    return { rawText, confidence: confidence / 100, total, merchant, date };
}

export function isOcrSupported(): boolean {
    return typeof window !== "undefined" && "WebAssembly" in window;
}

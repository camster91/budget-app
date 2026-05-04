"use client";

// Client-side OCR using Tesseract.js
// Uses dynamic import so the heavy wasm doesn't block initial load

export interface OcrResult {
    rawText: string;
    confidence: number;
    total?: number;
    merchant?: string;
    date?: string;
    items?: any[];
}

export async function parseReceiptImage(imageFile: File): Promise<OcrResult> {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng");
    const ret = await worker.recognize(imageFile);
    await worker.terminate();

    const rawText = ret.data.text;
    const confidence = ret.data.confidence;

    let total: number | undefined;
    let merchant: string | undefined;
    let date: string | undefined;
    let items: any[] | undefined;

    // Offload messy text parsing to our AI endpoint
    try {
        const response = await fetch("/api/ocr", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ rawText }),
        });

        if (response.ok) {
            const { data } = await response.json();
            total = data.total;
            merchant = data.merchant;
            date = data.date;
            items = data.items;
        } else {
            console.warn("AI OCR parse failed, returning raw text only");
        }
    } catch (e) {
        console.error("AI Parse request failed:", e);
    }

    return {
        rawText,
        confidence,
        total,
        merchant,
        date,
        items,
    };
}

export function isOcrSupported() {
    return typeof window !== "undefined" && "WebAssembly" in window;
}

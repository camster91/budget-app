"use server";

import { saveReceiptParse } from "./receipts";
import { ParsedReceipt } from "./receipts";

export async function handleReceiptParsed(parsed: {
    rawText: string;
    total?: number;
    merchant?: string;
    date?: string;
    confidence: number;
}) {
    return saveReceiptParse({
        imageUrl: "/receipts/ocr-processed.jpg",
        rawText: parsed.rawText,
        parsed: {
            total: parsed.total,
            merchant: parsed.merchant,
            date: parsed.date,
            items: [],
            confidence: parsed.confidence,
            rawText: parsed.rawText,
        },
    });
}

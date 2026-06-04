import { ParsedTransaction, parseTangerineText } from "./tangerineParser";
import { parseScotiabankCCText, parseGenericCCText } from "./scotiabankCCParser";

export type { ParsedTransaction } from "./tangerineParser";

export const SUPPORTED_BANKS = [
    { value: "tangerine", label: "Tangerine Chequing (PDF + CSV)", acceptsPdf: true, acceptsCsv: true },
    { value: "tangerine-cc", label: "Tangerine Mastercard (PDF)", acceptsPdf: true, acceptsCsv: false },
    { value: "scotiabank-cc", label: "Scotiabank Mastercard (PDF)", acceptsPdf: true, acceptsCsv: false },
    { value: "pcfinancial-cc", label: "PC Financial Mastercard (PDF)", acceptsPdf: true, acceptsCsv: false },
    { value: "rbc-cc", label: "RBC Credit Card (PDF)", acceptsPdf: true, acceptsCsv: false },
    { value: "td-cc", label: "TD Credit Card (PDF)", acceptsPdf: true, acceptsCsv: false },
    { value: "cibc-cc", label: "CIBC Credit Card (PDF)", acceptsPdf: true, acceptsCsv: false },
    { value: "amex-cc", label: "American Express (PDF)", acceptsPdf: true, acceptsCsv: false },
    { value: "generic", label: "Generic Bank (CSV only)", acceptsPdf: false, acceptsCsv: true },
] as const;

export type BankCode = (typeof SUPPORTED_BANKS)[number]["value"];

export function parseStatement(text: string, bank: string): ParsedTransaction[] {
    switch (bank.toLowerCase()) {
        case "tangerine":
            return parseTangerineText(text);
        case "scotiabank-cc":
        case "pcfinancial-cc":
        case "tangerine-cc":
            // Same template: Scotiabank PDF format. Tangerine is a Scotiabank subsidiary.
            return parseScotiabankCCText(text);
        case "rbc-cc":
        case "td-cc":
        case "cibc-cc":
        case "amex-cc":
            return parseGenericCCText(text);
        default:
            console.warn(`No parser implemented for bank: ${bank}`);
            return [];
    }
}

export function bankAcceptsPdf(bank: string): boolean {
    const entry = SUPPORTED_BANKS.find(b => b.value === bank.toLowerCase());
    return entry ? entry.acceptsPdf : false;
}

export function bankAcceptsCsv(bank: string): boolean {
    const entry = SUPPORTED_BANKS.find(b => b.value === bank.toLowerCase());
    return entry ? entry.acceptsCsv : false;
}

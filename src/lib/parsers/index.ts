import { ParsedTransaction, parseTangerineText } from "./tangerineParser";

export type { ParsedTransaction };

export function parseStatement(text: string, bank: string): ParsedTransaction[] {
    switch (bank.toLowerCase()) {
        case "tangerine":
            return parseTangerineText(text);
        default:
            console.warn(`No parser implemented for bank: ${bank}`);
            return [];
    }
}

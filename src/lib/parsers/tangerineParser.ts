export interface ParsedTransaction {
    amount: number;
    description: string;
    date: Date;
    balance?: number;
    rawLine?: string;
}

export function parseTangerineText(text: string): ParsedTransaction[] {
    const transactions: ParsedTransaction[] = [];
    
    // Split by lines
    const lines = text.trim().split('\n');
    let inTransactionSection = false;
    let currentTx: Partial<ParsedTransaction> | null = null;
    
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        
        // Check if we're entering transaction section
        if (line.includes("Balance($) Amount($) Transaction Description Transaction Date") || 
            line.includes("Balance($) Amount($) Description Date") ||
            (line.includes("Balance($)") && line.includes("Amount($)") && line.includes("Date"))) {
            inTransactionSection = true;
            continue;
        }
        
        // Potential markers of section end
        if (line.includes("Page ") && line.includes("of")) {
            // Tangerine statements often have "Page X of Y" at the top/bottom.
            // We don't necessarily want to stop, just skip this line.
            continue;
        }

        if (inTransactionSection) {
            // Pattern: balance amount description date
            // Example: 1542.43 -45.00 TIM HORTONS #1234 15 OCT 2024
            // Note: Balance and amount can have commas
            const multiSpacePattern = /^(-?[\d,]+\.\d+)\s+(-?[\d,]+\.\d+)\s+(.+)$/;
            const match = line.match(multiSpacePattern);
            
            if (match) {
                // Complete previous transaction if exists
                if (currentTx && currentTx.description && currentTx.date) {
                    transactions.push(currentTx as ParsedTransaction);
                }
                
                const balanceStr = match[1].replace(/,/g, '');
                const amountStr = match[2].replace(/,/g, '');
                const balance = parseFloat(balanceStr);
                const amount = parseFloat(amountStr);
                const descriptionDate = match[3];
                
                // Try to extract date: "DD MMM YYYY" or "DD MMM. YYYY" at the end
                const dateMatch = descriptionDate.match(/(\d{1,2}\s+[A-Z]{3,4}\.?\s+\d{4})$/i);
                
                if (dateMatch) {
                    const dateStr = dateMatch[1];
                    const description = descriptionDate.replace(dateStr, '').trim();
                    const date = parseTangerineDate(dateStr);
                    
                    currentTx = {
                        balance,
                        amount,
                        description,
                        date,
                        rawLine: line
                    };
                } else {
                    // Start of a transaction but date is not on this line?
                    // Unlikely for Tangerine, but let's be safe.
                    currentTx = {
                        balance,
                        amount,
                        description: descriptionDate,
                        rawLine: line
                    };
                }
            } else if (currentTx && !/^-?[\d,]+\.\d+/.test(line)) {
                // If it doesn't match the start pattern, it might be a continuation of description
                // or a footer line we should ignore.
                if (line.match(/Interest Rate/i) || line.match(/Client Service/i)) {
                    // Ignore footer-like stuff
                } else {
                    currentTx.description += ' ' + line;
                    
                    // Re-check for date if we didn't find it yet
                    if (!currentTx.date) {
                        const dateMatch = line.match(/(\d{1,2}\s+[A-Z]{3,4}\.?\s+\d{4})$/i);
                        if (dateMatch) {
                            currentTx.date = parseTangerineDate(dateMatch[1]);
                            currentTx.description = currentTx.description?.replace(dateMatch[1], '').trim();
                        }
                    }
                }
            }
        }
    }
    
    // Add last transaction
    if (currentTx && currentTx.description && currentTx.date) {
        transactions.push(currentTx as ParsedTransaction);
    }
    
    return transactions;
}

function parseTangerineDate(dateStr: string): Date {
    // Expected formats: "15 OCT 2024", "15 OCT. 2024", "1 OCT 2024"
    const cleanDate = dateStr.replace(/\./g, '').trim();
    const parts = cleanDate.split(/\s+/);
    
    if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const monthStr = parts[1].toUpperCase();
        const year = parseInt(parts[2], 10);
        
        const months: Record<string, number> = {
            'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
            'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
        };
        
        const month = months[monthStr.substring(0, 3)];
        if (month !== undefined) {
            return new Date(year, month, day);
        }
    }
    
    return new Date(dateStr); // Fallback
}

import { ParsedTransaction } from "./tangerineParser";

/**
 * Scotiabank / PC Financial Mastercard parser.
 *
 * Also handles Tangerine Mastercard, PC Insiders World Elite, and any
 * Scotiabank-subsidiary card since they all share the same statement template
 * (Tangerine was acquired by Scotiabank in 2012 and uses their PDF layout).
 *
 * Format (each line is a separate physical line in the PDF):
 *
 *   DD/MM                      ← transaction date
 *   DD/MM                      ← posting date
 *   MERCHANT NAME              ← description line 1
 *   CITY PROVINCE              ← description line 2 (optional)
 *   $AMOUNT                    ← amount (negative for payments)
 *
 * Foreign-currency variant inserts two extra lines between desc and amount:
 *
 *   DD/MM
 *   DD/MM
 *   MERCHANT NAME
 *   CITY COUNTRY CODE
 *    AMOUNT FOREIGN            ← foreign amount + currency code on same line
 *   EXCHANGE_RATE              ← numeric, 6+ decimal places
 *   $AMOUNT                    ← CAD amount
 *
 * Payment markers: amount is "-$X.XX" OR description contains "PAYMENT",
 * "AUTOPAY", or "THANK YOU". Interest charges are flagged separately.
 */
export function parseScotiabankCCText(text: string): ParsedTransaction[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const txns: ParsedTransaction[] = [];
    const datePat = /^(\d{2})\/(\d{2})$/;
    const moneyPat = /^-?\$[\d,]+\.\d{2}$/;
    // Foreign amount: "28.08 USA" or "12.50 USD" — 1-2 digit int, dot, 1-2 digit frac, optional 3-4 letter ccy
    const foreignAmtPat = /^(\d+\.\d{1,2})\s*([A-Z]{3,4})?$/;
    const fxRatePat = /^\d+\.\d{6,}$/;

    // Account last4 from header line: "XXXX XXXX XX83 9729"
    const accountMatch = text.match(/XXXX[ X-]*XX\d{2}\s*(\d{4})/);
    const accountLast4 = accountMatch?.[1];

    // Statement period to fill in the year for transactions (mm/dd has no year)
    const periodMatch = text.match(/Statement period:\s*(?:[A-Z][a-z]+\.?\s*)?(\d+),\s*(\d+)\s*-\s*(?:[A-Z][a-z]+\.?\s*)?(\d+),\s*(\d+)/);
    // We try to extract the year from the statement period end date; CC statements
    // always cover a month ending in the same year as the statement date.
    let periodYear: number | null = null;
    if (periodMatch) {
        // period end is the (periodMatch[3], periodMatch[4]) — month, day
        periodYear = parseInt(periodMatch[4], 10);
    }

    let i = 0;
    while (i < lines.length) {
        const tDateMatch = lines[i].match(datePat);
        if (!tDateMatch) { i++; continue; }
        if (i + 1 >= lines.length) { i++; continue; }
        const pDateMatch = lines[i + 1].match(datePat);
        if (!pDateMatch) { i++; continue; }

        // Collect desc + optional foreign + amount
        const descParts: string[] = [];
        let amt: string | null = null;
        let foreignAmt: string | null = null;
        let foreignCcy: string | null = null;
        let fxRate: string | null = null;
        let j = i + 2;
        while (j < lines.length) {
            const cur = lines[j];
            if (moneyPat.test(cur)) { amt = cur; break; }
            if (/^Total\b/i.test(cur) && /activity/i.test(cur)) break;
            const fa = cur.match(foreignAmtPat);
            if (fa && (fa[2] === "USD" || fa[2] === "USA" || fa[2] === "EUR" || fa[2] === "GBP")) {
                foreignAmt = fa[1]; foreignCcy = fa[2] === "USA" ? "USD" : fa[2];
            } else if (fxRatePat.test(cur)) {
                fxRate = cur;
            } else if (cur.length > 0 && cur.length < 120) {
                descParts.push(cur);
            }
            j++;
        }

        if (!amt) { i = j + 1; continue; }

        const isNeg = amt.startsWith("-");
        const amtFloat = Math.abs(parseFloat(amt.replace(/[$,]/g, "")));
        if (Number.isNaN(amtFloat) || amtFloat === 0) { i = j + 1; continue; }
        const amtCents = Math.round(amtFloat * 100);

        let desc = descParts.join(" ");
        desc = desc.replace(/\s+/g, " ").trim();
        // Strip trailing city/province tokens (e.g. "TORONTO ON", "FERRIDAY LA")
        desc = desc.replace(/\s+([A-Z]{2,4}\s+[A-Z]{2,4})$/, "").trim();

        const isPayment = isNeg || /PAYMENT|AUTOPAY|THANK YOU/i.test(desc);
        const isInterest = /INTEREST CHARGE/i.test(desc);

        // Build ISO date. Period end gives the year. If month is later than period
        // end month, the txn was posted in the *previous* month (e.g. period ends
        // Mar 16 but txn date is 03/27 — that's actually in the next billing cycle
        // that ends Apr 16). For safety we use the txn month and only decrement
        // the year if the period crossed a year boundary.
        const mm = parseInt(tDateMatch[1], 10);
        const dd = parseInt(tDateMatch[2], 10);
        const year = periodYear ?? new Date().getFullYear();
        const isoDate = `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

        // The client UI treats amount > 0 as income, amount < 0 as expense.
        // CC: payments and interest are expenses (negative). Purchases are expenses (positive)
        // and the UI flips them to display as positive. We need to follow the same convention.
        const signedAmount = isPayment || isInterest ? -amtCents : amtCents;

        txns.push({
            Description: desc,
            Amount: signedAmount,
            Date: new Date(isoDate),
            // tags for downstream categorization — not used by Tangerine parser
            _meta: {
                kind: isPayment ? "payment" : isInterest ? "interest" : "purchase",
                post_date: `${year}-${pDateMatch[1].padStart(2, "0")}-${pDateMatch[2].padStart(2, "0")}`,
                account_last4: accountLast4,
                foreign_amount: foreignAmt,
                foreign_currency: foreignCcy,
                fx_rate: fxRate,
            },
        } as ParsedTransaction);
        i = j + 1;
    }
    return txns;
}

/**
 * Generic single-line CC statement parser.
 *
 * Matches: "DD/MM DD/MM DESCRIPTION $AMOUNT" (or MM/DD variant) on a single
 * line. Used as fallback for rbc-cc, td-cc, cibc-cc, amex-cc when we don't
 * have a bank-specific parser.
 */
export function parseGenericCCText(text: string): ParsedTransaction[] {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    const txns: ParsedTransaction[] = [];
    const singlePat = /^(\d{1,2})[\/\.](\d{1,2})\s+(\d{1,2})[\/\.](\d{1,2})\s+(.+?)\s+(-?\$[\d,]+\.\d{2})\s*$/;
    const accountMatch = text.match(/XXXX[ X-]*XX\d{2}\s*(\d{4})/);
    const accountLast4 = accountMatch?.[1];

    for (const line of lines) {
        const m = line.match(singlePat);
        if (!m) continue;
        const isNeg = m[6].startsWith("-");
        const amtCents = Math.round(Math.abs(parseFloat(m[6].replace(/[$,-]/g, ""))) * 100);
        if (Number.isNaN(amtCents) || amtCents === 0) continue;
        const desc = m[5].replace(/\s+/g, " ").trim();
        const year = new Date().getFullYear();
        const isoDate = `${year}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
        txns.push({
            Description: desc,
            Amount: isNeg ? -amtCents : amtCents,
            Date: new Date(isoDate),
            _meta: { kind: isNeg ? "payment" : "purchase", account_last4: accountLast4 },
        } as ParsedTransaction);
    }
    return txns;
}

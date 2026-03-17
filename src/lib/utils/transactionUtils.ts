export function isTransfer(description: string): boolean {
    const transferKeywords = ["TRANSFER", "PAYMENT TO", "DEBIT", "CREDIT", "E-TRANSFER", "PAYPAL"];
    const upperDesc = description.toUpperCase();
    return transferKeywords.some(keyword => upperDesc.includes(keyword));
}

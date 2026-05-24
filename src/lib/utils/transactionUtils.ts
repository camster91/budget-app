export function isTransfer(description: string): boolean {
    const transferKeywords = [
        "INTERAC E-TRANSFER",
        "TRANSFER TO",
        "TRANSFER FROM",
        "FROM SAVINGS",
        "TO CHEQUING",
        "ACCOUNT TRANSFER",
        "INTERNAL TRANSFER",
        "BETWEEN ACCOUNTS",
    ];
    const upperDesc = description.toUpperCase();
    return transferKeywords.some(keyword => upperDesc.includes(keyword));
}

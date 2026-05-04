import { Category } from "@prisma/client";

export interface Rule {
    keyword: string;
    type: 'contains' | 'equals';
}

export function categorizeTransaction(
    description: string,
    categories: Category[]
): string | null {
    const desc = description.toLowerCase().trim();
    const matches: { categoryId: string, rule: Rule }[] = [];
    
    for (const category of categories) {
        if (!category.rules) continue;
        
        try {
            const rules: Rule[] = JSON.parse(category.rules);
            for (const rule of rules) {
                const keyword = rule.keyword.toLowerCase().trim();
                
                if (rule.type === 'equals' && desc === keyword) {
                    matches.push({ categoryId: category.id, rule });
                } else if (rule.type === 'contains' && desc.includes(keyword)) {
                    matches.push({ categoryId: category.id, rule });
                }
            }
        } catch (e) {
            console.error(`Invalid rules for category ${category.name}`, e);
        }
    }

    if (matches.length === 0) return null;

    // Prioritization:
    // 1. 'equals' match always wins
    // 2. Longer keyword wins (more specific)
    matches.sort((a, b) => {
        if (a.rule.type === 'equals' && b.rule.type !== 'equals') return -1;
        if (b.rule.type === 'equals' && a.rule.type !== 'equals') return 1;
        return b.rule.keyword.length - a.rule.keyword.length;
    });

    return matches[0].categoryId;
}

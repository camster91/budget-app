import { Category } from "@prisma/client";

export interface Rule {
    keyword: string;
    type: 'contains' | 'equals';
}

export function categorizeTransaction(
    description: string,
    categories: Category[]
): string | null {
    const desc = description.toLowerCase();
    
    for (const category of categories) {
        if (!category.rules) continue;
        
        try {
            const rules: Rule[] = JSON.parse(category.rules);
            for (const rule of rules) {
                const keyword = rule.keyword.toLowerCase();
                
                if (rule.type === 'contains' && desc.includes(keyword)) return category.id;
                if (rule.type === 'equals' && desc === keyword) return category.id;
            }
        } catch (e) {
            console.error(`Invalid rules for category ${category.name}`, e);
        }
    }
    return null;
}

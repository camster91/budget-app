import { prisma } from "@/lib/prisma";
import { categorizeTransaction as ruleBasedCategorize } from "./rulesEngine";

/**
 * Enterprise-grade categorization service.
 * In a real large company, this would:
 * 1. Check a global cache (Redis) for merchant category mapping.
 * 2. If not found, use a dedicated ML model service.
 * 3. Fall back to local rules.
 * 4. Update the global cache with the result.
 */
export async function getSmartCategory(householdId: string, description: string): Promise<string | null> {
    // 1. Check local household patterns first (highest signal)
    const pattern = await prisma.spendingPattern.findFirst({
        where: { 
            householdId,
            categoryId: { not: "" }
        },
        // In a real app, we'd match description against known patterns
    });

    // 2. Local rules engine
    const categories = await prisma.category.findMany({ where: { householdId } });
    const localMatch = ruleBasedCategorize(description, categories);
    if (localMatch) return localMatch;

    // 3. Global AI inference (simulated enterprise ML)
    // In production, this would be a call to a dedicated 'Categorization Microservice'
    return null; 
}

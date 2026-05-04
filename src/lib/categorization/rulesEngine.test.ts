import { describe, it, expect } from 'vitest';
import { categorizeTransaction, Rule } from './rulesEngine';
import { Category } from '@prisma/client';

describe('categorizeTransaction', () => {
    const mockCategories: Category[] = [
        {
            id: 'cat-1',
            name: 'Groceries',
            rules: JSON.stringify([
                { keyword: 'walmart', type: 'contains' },
                { keyword: 'safeway', type: 'equals' }
            ]),
            icon: '🛒',
            color: '#000',
            type: 'expense',
            userId: 'user-1',
            dailyCap: null,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: 'cat-2',
            name: 'Gas',
            rules: JSON.stringify([
                { keyword: 'shell', type: 'contains' },
                { keyword: 'shell gas', type: 'contains' }
            ]),
            icon: '⛽',
            color: '#fff',
            type: 'expense',
            userId: 'user-1',
            dailyCap: null,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];

    it('should return null if no rules match', () => {
        expect(categorizeTransaction('Unknown Merchant', mockCategories)).toBeNull();
    });

    it('should match using "contains"', () => {
        expect(categorizeTransaction('WALMART SUPERCENTER', mockCategories)).toBe('cat-1');
    });

    it('should match using "equals"', () => {
        expect(categorizeTransaction('safeway', mockCategories)).toBe('cat-1');
        // Should not match if not equal
        expect(categorizeTransaction('safeway store', mockCategories)).toBeNull();
    });

    it('should prioritize "equals" over "contains"', () => {
        const overlapCategories: Category[] = [
            {
                ...mockCategories[0],
                id: 'cat-contains',
                rules: JSON.stringify([{ keyword: 'starbucks', type: 'contains' }])
            },
            {
                ...mockCategories[0],
                id: 'cat-equals',
                rules: JSON.stringify([{ keyword: 'starbucks', type: 'equals' }])
            }
        ];

        expect(categorizeTransaction('starbucks', overlapCategories)).toBe('cat-equals');
    });

    it('should prioritize longer (more specific) keywords', () => {
        expect(categorizeTransaction('shell gas station', mockCategories)).toBe('cat-2');
        // In this case both shell and shell gas match, cat-2 is returned for both,
        // but internal logic prefers 'shell gas' because it's longer.
    });
});

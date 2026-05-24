import { z } from "zod";

export const createTransactionSchema = z.object({
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    description: z.string().min(1, "Description is required").max(255, "Description too long"),
    date: z.coerce.date(),
    type: z.enum(["income", "expense"]),
    isDiscretionary: z.coerce.boolean().default(true),
    categoryId: z.string().uuid().optional(),
    categoryName: z.string().min(1).optional(),
});

export const updateTransactionSchema = z.object({
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    description: z.string().min(1, "Description is required").max(255, "Description too long"),
    date: z.coerce.date(),
    type: z.enum(["income", "expense"]),
    categoryId: z.string().uuid().optional(),
    isDiscretionary: z.coerce.boolean().optional(),
});

export const createBudgetSchema = z.object({
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    categoryId: z.string().uuid().optional(),
    category: z.string().min(1).optional(),
    period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be YYYY-MM").default(() => new Date().toISOString().slice(0, 7)),
});

export const createGoalSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    targetAmount: z.coerce.number().positive("Target amount must be greater than 0"),
    currentAmount: z.coerce.number().min(0, "Current amount cannot be negative").default(0),
    categoryId: z.string().uuid().optional(),
    targetDate: z.coerce.date().optional(),
});

export const updateGoalSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    targetAmount: z.coerce.number().positive("Target amount must be greater than 0"),
    currentAmount: z.coerce.number().min(0, "Current amount cannot be negative"),
    categoryId: z.string().uuid().nullable().optional(),
    targetDate: z.coerce.date().nullable().optional(),
});

export const createBillSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    dueDay: z.coerce.number().int().min(1, "Due day must be 1–31").max(31, "Due day must be 1–31"),
    categoryId: z.string().uuid("Category is required"),
    accountId: z.string().uuid("Account is required"),
});

export const updateBillSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    dueDay: z.coerce.number().int().min(1, "Due day must be 1–31").max(31, "Due day must be 1–31"),
    categoryId: z.string().uuid("Category is required"),
    accountId: z.string().uuid("Account is required"),
});

export const createAccountSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    type: z.enum(["checking", "savings", "credit", "investment", "cash"]),
    institution: z.string().max(100).optional(),
    balance: z.coerce.number().default(0),
    color: z.string().max(20).optional(),
});

export const createCategorySchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    icon: z.string().max(50).optional(),
    color: z.string().max(20).optional(),
    type: z.enum(["income", "expense"]),
    rules: z.string().max(5000).optional(),
});

export const updateCategorySchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    icon: z.string().max(50).optional(),
    color: z.string().max(20).optional(),
    rules: z.string().max(5000).optional(),
});

export const updateCategoryBudgetCapSchema = z.object({
    dailyCap: z.coerce.number().min(0, "Daily cap cannot be negative").nullable().optional(),
});

export const createIncomeSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    frequency: z.enum(["monthly", "biweekly", "weekly"]),
    startDate: z.coerce.date(),
    dayOfMonth: z.coerce.number().int().min(1).max(31).nullable().optional(),
});

export const updateIncomeSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    amount: z.coerce.number().positive("Amount must be greater than 0"),
    frequency: z.enum(["monthly", "biweekly", "weekly"]),
    startDate: z.coerce.date(),
    dayOfMonth: z.coerce.number().int().min(1).max(31).nullable().optional(),
    isActive: z.coerce.boolean().optional(),
});

/** Parse FormData into a plain object for Zod validation */
export function parseFormData(formData: FormData): Record<string, unknown> {
    const obj: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
        // If the same key appears multiple times, keep the last one (FormData standard behavior)
        obj[key] = value;
    }
    return obj;
}

/** Validate FormData with a Zod schema and return either data or error string */
export function validateFormData<T extends z.ZodTypeAny>(
    formData: FormData,
    schema: T
): { success: true; data: z.infer<T> } | { success: false; error: string } {
    const raw = parseFormData(formData);
    const result = schema.safeParse(raw);
    if (!result.success) {
        const firstError = result.error.issues[0];
        return { success: false, error: `${firstError.path.join(".")}: ${firstError.message}` };
    }
    return { success: true, data: result.data };
}

export const createWishlistItemSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name too long"),
    price: z.coerce.number().positive("Price must be greater than 0"),
    link: z.string().url("Invalid product link URL").or(z.literal("")).optional(),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
});

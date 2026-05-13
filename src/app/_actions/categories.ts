"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { createCategorySchema, updateCategorySchema, updateCategoryBudgetCapSchema, validateFormData } from "@/lib/validation";
import { toCents } from "@/lib/utils";

export async function getCategories() {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const categories = await prisma.category.findMany({
            where: { householdId: user.householdId },
            orderBy: { name: "asc" },
        });
        return { success: true, data: categories };
    } catch (error) {
        return { success: false, error: "Failed to fetch categories" };
    }
}

export async function createCategory(formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validated = validateFormData(formData, createCategorySchema);
    if (!validated.success) return { success: false, error: validated.error };

    const { name, icon, color, type, rules } = validated.data;

    try {
        const existing = await prisma.category.findFirst({
            where: { name, householdId: user.householdId },
        });
        if (existing) {
            return { success: false, error: "A category with this name already exists" };
        }

        await prisma.category.create({
            data: {
                name,
                icon,
                color,
                type,
                rules,
                householdId: user.householdId
            },
        });
        revalidatePath("/categories");
        return { success: true };
    } catch (error) {
        console.error("Failed to create category:", error);
        return { success: false, error: "Failed to create category" };
    }
}

export async function updateCategory(id: string, formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validated = validateFormData(formData, updateCategorySchema);
    if (!validated.success) return { success: false, error: validated.error };

    const { name, icon, color, rules } = validated.data;

    try {
        const existing = await prisma.category.findFirst({
            where: { 
                name, 
                householdId: user.householdId,
                id: { not: id }
            },
        });
        if (existing) {
            return { success: false, error: "A category with this name already exists" };
        }

        await prisma.category.update({
            where: { id, householdId: user.householdId },
            data: {
                name,
                icon,
                color,
                rules,
            },
        });
        revalidatePath("/categories");
        return { success: true };
    } catch (error) {
        console.error("Failed to update category:", error);
        return { success: false, error: "Failed to update category" };
    }
}

export async function updateCategoryBudgetCap(id: string, formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const validated = validateFormData(formData, updateCategoryBudgetCapSchema);
    if (!validated.success) return { success: false, error: validated.error };

    const { dailyCap } = validated.data;

    try {
        await prisma.category.update({
            where: { id, householdId: user.householdId },
            data: { dailyCap: dailyCap != null ? toCents(dailyCap) : null },
        });
        revalidatePath("/settings");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update budget cap" };
    }
}

export async function deleteCategory(id: string) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        await prisma.$transaction([
            prisma.transaction.updateMany({ where: { categoryId: id, householdId: user.householdId }, data: { categoryId: null } }),
            prisma.goal.updateMany({ where: { categoryId: id, householdId: user.householdId }, data: { categoryId: null } }),
            prisma.budget.deleteMany({ where: { categoryId: id, householdId: user.householdId } }),
            prisma.bill.deleteMany({ where: { categoryId: id, householdId: user.householdId } }),
            prisma.category.delete({ where: { id, householdId: user.householdId } }),
        ]);
        revalidatePath("/categories");
        revalidatePath("/bills");
        return { success: true };
    } catch (error) {
        console.error("Failed to delete category:", error);
        return { success: false, error: "Failed to delete category" };
    }
}

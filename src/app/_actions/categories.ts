"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

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
    try {
        const name = formData.get("name") as string;
        const icon = formData.get("icon") as string;
        const color = formData.get("color") as string;
        const type = formData.get("type") as string;
        const rules = formData.get("rules") as string; // Expecting JSON string

        // Check for duplicate name in this household
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
    try {
        const name = formData.get("name") as string;
        const icon = formData.get("icon") as string;
        const color = formData.get("color") as string;
        const rules = formData.get("rules") as string;

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
    try {
        const dailyCapRaw = formData.get("dailyCap") as string;
        const dailyCap = dailyCapRaw === "" || dailyCapRaw === null ? null : parseFloat(dailyCapRaw);

        await prisma.category.update({
            where: { id, householdId: user.householdId },
            data: { dailyCap },
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

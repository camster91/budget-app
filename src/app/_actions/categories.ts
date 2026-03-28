"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createCategory(formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const icon = formData.get("icon") as string;
        const color = formData.get("color") as string;
        const type = formData.get("type") as string;
        const rules = formData.get("rules") as string; // Expecting JSON string

        await prisma.category.create({
            data: {
                name,
                icon,
                color,
                type,
                rules,
            },
        });
        revalidatePath("/categories");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to create category" };
    }
}

export async function updateCategory(id: string, formData: FormData) {
    try {
        const name = formData.get("name") as string;
        const icon = formData.get("icon") as string;
        const color = formData.get("color") as string;
        const rules = formData.get("rules") as string;

        await prisma.category.update({
            where: { id },
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
        return { success: false, error: "Failed to update category" };
    }
}

export async function deleteCategory(id: string) {
    try {
        // Null out FK references before deleting to avoid constraint errors
        await prisma.$transaction([
            prisma.transaction.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
            prisma.budget.deleteMany({ where: { categoryId: id } }),
            prisma.bill.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
            prisma.goal.updateMany({ where: { categoryId: id }, data: { categoryId: null } }),
            prisma.category.delete({ where: { id } }),
        ]);
        revalidatePath("/categories");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete category" };
    }
}

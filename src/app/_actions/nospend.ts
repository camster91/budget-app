"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { startOfDay, endOfDay } from "date-fns";

export async function toggleNoSpendMode(formData: FormData) {
    if (!await getAuthUser()) return { success: false, error: "Unauthorized" };
    try {
        const isActive = formData.get("isActive") === "true";
        revalidatePath("/daily");
        return { success: true, data: { isActive } };
    } catch (error) {
        return { success: false, error: "Failed to toggle" };
    }
}

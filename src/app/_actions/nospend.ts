"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";
import { revalidatePath } from "next/cache";
import { startOfDay } from "date-fns";

export async function toggleNoSpendMode(formData: FormData) {
    const user = await getAuthUser();
    if (!user) return { success: false, error: "Unauthorized" };
    try {
        const isActive = formData.get("isActive") === "true";
        const todayStart = startOfDay(new Date());

        if (isActive) {
            // Upsert a NoSpendEntry for today
            await prisma.noSpendEntry.upsert({
                where: {
                    householdId_date: {
                        householdId: user.householdId!,
                        date: todayStart,
                    },
                },
                update: {},
                create: {
                    date: todayStart,
                    householdId: user.householdId!,
                },
            });
        } else {
            // Remove any NoSpendEntry for today
            await prisma.noSpendEntry.deleteMany({
                where: {
                    householdId: user.householdId!,
                    date: todayStart,
                },
            });
        }

        revalidatePath("/daily");
        return { success: true, data: { isActive } };
    } catch (error) {
        console.error("Failed to toggle no-spend mode:", error);
        return { success: false, error: "Failed to toggle" };
    }
}

export async function isNoSpendActive(): Promise<boolean> {
    const user = await getAuthUser();
    if (!user) return false;
    try {
        const todayStart = startOfDay(new Date());
        const entry = await prisma.noSpendEntry.findFirst({
            where: {
                householdId: user.householdId!,
                date: todayStart,
            },
        });
        return !!entry;
    } catch {
        return false;
    }
}

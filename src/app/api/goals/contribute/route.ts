import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/getAuthUser";

export async function POST(req: Request) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { goalId, amount, note } = await req.json();
    if (!goalId || !amount || Number(amount) <= 0) {
        return NextResponse.json({ error: "Goal ID and positive amount required" }, { status: 400 });
    }

    const cents = Math.round(Number(amount) * 100);

    try {
        const goal = await prisma.goal.findUnique({
            where: { id: goalId, householdId: user.householdId },
        });
        if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

        await prisma.$transaction([
            prisma.goalContribution.create({
                data: { amount: cents, note: note || null, goalId, householdId: user.householdId },
            }),
            prisma.goal.update({
                where: { id: goalId },
                data: { currentAmount: { increment: cents } },
            }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[goal contribute]", error);
        return NextResponse.json({ error: "Failed to contribute" }, { status: 500 });
    }
}

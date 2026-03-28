import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, verifyPassword, hashPassword } from "@/lib/auth";

export async function POST(request: Request) {
    const auth = await getAuthUser();
    if (!auth) {
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { name, email, currentPassword, newPassword } = body;

        const user = await prisma.user.findUnique({ where: { id: auth.userId } });
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const updateData: { name?: string; email?: string; password?: string } = {};

        if (name !== undefined) updateData.name = name;

        if (email && email !== user.email) {
            const existing = await prisma.user.findUnique({ where: { email } });
            if (existing) {
                return NextResponse.json({ error: "Email already in use" }, { status: 400 });
            }
            updateData.email = email;
        }

        if (newPassword) {
            if (!currentPassword) {
                return NextResponse.json({ error: "Current password required" }, { status: 400 });
            }
            const valid = await verifyPassword(currentPassword, user.password);
            if (!valid) {
                return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
            }
            updateData.password = await hashPassword(newPassword);
        }

        const updated = await prisma.user.update({
            where: { id: auth.userId },
            data: updateData,
            select: { id: true, email: true, name: true },
        });

        return NextResponse.json({ user: updated });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

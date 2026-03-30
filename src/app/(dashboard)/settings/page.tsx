export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { SettingsClient } from "./SettingsClient";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
    const auth = await getAuthUser();
    if (!auth) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { id: true, email: true, name: true },
    });

    if (!user) redirect("/login");

    return <SettingsClient user={user} />;
}

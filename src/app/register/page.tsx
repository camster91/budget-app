import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import RegisterPageClient from "./RegisterPageClient";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
    // Single-user app: once an account exists, registration is closed
    const userCount = await prisma.user.count();
    if (userCount > 0) {
        redirect("/login");
    }
    return <RegisterPageClient />;
}

"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { MobileNav } from "@/components/layout/mobile-nav";
import { useEffect, useState } from "react";

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
    if (name) {
        const parts = name.trim().split(" ");
        if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "?";
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [user, setUser] = useState<{ name: string | null; email: string } | null>(null);

    useEffect(() => {
        fetch("/api/auth/me")
            .then((r) => r.json())
            .then((data) => { if (data.user) setUser(data.user); })
            .catch(() => {});
    }, []);

    const displayName = user?.name || user?.email?.split("@")[0] || "User";
    const initials = getInitials(user?.name, user?.email);

    const pageTitle = pathname === "/" ? "Overview" : pathname.replace("/", "").replace(/-/g, " ");

    return (
        <div className="relative flex h-screen w-full overflow-hidden bg-background bg-grid">
            {/* Background Glows */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-[#8b5cf61a] blur-[120px] rounded-full pointer-events-none" />

            <div className="hidden md:block z-10 p-4 pr-0 text-white">
                <Sidebar />
            </div>

            <div className="flex flex-1 flex-col overflow-hidden z-10">
                <header className="flex h-20 items-center justify-between px-4 md:px-8 bg-transparent border-b border-white/[0.05]">
                    <div className="flex items-center gap-4">
                        <MobileNav />
                        <div>
                            <h1 className="text-xl font-bold text-white/90 capitalize tracking-tight">
                                {pageTitle}
                            </h1>
                            <p className="text-xs text-muted-foreground font-medium hidden md:block">
                                Welcome back, {displayName}.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white">
                            <span className="text-xs font-bold">{initials}</span>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto overflow-x-hidden p-8 text-white">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={pathname}
                            initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
                            transition={{ duration: 0.4, ease: "circOut" }}
                            className="max-w-7xl mx-auto w-full"
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </main>
            </div>
        </div>
    );
}

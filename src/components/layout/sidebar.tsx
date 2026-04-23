"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard,
    Receipt,
    PiggyBank,
    Settings,
    LogOut,
    Target,
    FileText,
    CreditCard,
    Tag,
    Flame,
} from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const sidebarItems = [
    { title: "Dashboard", href: "/", icon: LayoutDashboard },
    { title: "Daily Spend", href: "/daily", icon: Flame },
    { title: "Transactions", href: "/transactions", icon: Receipt },
    { title: "Budgets", href: "/budgets", icon: PiggyBank },
    { title: "Goals", href: "/goals", icon: Target },
    { title: "Bills", href: "/bills", icon: FileText },
    { title: "Accounts", href: "/accounts", icon: CreditCard },
    { title: "Categories", href: "/categories", icon: Tag },
    { title: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    }

    return (
        <div className="flex h-full w-64 flex-col glass border-r-0">
            <div className="flex h-20 items-center px-8">
                <Link href="/" className="flex items-center gap-3 group">
                    <div className="p-2 rounded-xl bg-primary/20 text-primary group-hover:scale-110 transition-transform duration-300">
                        <PiggyBank className="h-6 w-6" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-gradient">
                        Antigravity
                    </span>
                </Link>
            </div>

            <div className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                <p className="px-4 mb-4 text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60">
                    Main Menu
                </p>
                <nav className="space-y-1">
                    {sidebarItems.map((item, index) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={index}
                                href={item.href}
                                className={cn(
                                    "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300",
                                    isActive
                                        ? "text-white bg-white/[0.05] shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                                        : "text-muted-foreground hover:text-white hover:bg-white/[0.02]"
                                )}
                            >
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute left-0 w-1 h-6 bg-primary rounded-full"
                                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                    />
                                )}
                                <item.icon className={cn(
                                    "h-4 w-4 transition-colors duration-300",
                                    isActive ? "text-primary" : "group-hover:text-primary/70"
                                )} />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 mt-auto">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    Sign out
                </Button>
            </div>
        </div>
    );
}

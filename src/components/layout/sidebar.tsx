"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    LayoutDashboard,
    Receipt,
    PiggyBank,
    Settings,
    LogOut,
    Flame,
    ChevronDown,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const t = useTranslations();
    const [moreOpen, setMoreOpen] = useState(false);

    const primaryItems = [
        { title: t("nav.dashboard"), href: "/", icon: LayoutDashboard },
        { title: t("nav.dailySpend"), href: "/daily", icon: Flame },
        { title: t("nav.transactions"), href: "/transactions", icon: Receipt },
        { title: t("nav.budgets"), href: "/budgets", icon: PiggyBank },
        { title: t("nav.settings"), href: "/settings", icon: Settings },
    ];

    const moreItems = [
        { title: t("nav.bills"), href: "/bills" },
        { title: t("nav.goals"), href: "/goals" },
        { title: t("nav.accounts"), href: "/accounts" },
        { title: t("nav.categories"), href: "/categories" },
        { title: t("nav.wishlist"), href: "/wishlist" },
    ];

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    }

    return (
        <div className="flex h-full w-56 flex-col glass border-r-0">
            <div className="flex h-20 items-center px-6">
                <Link href="/" className="flex items-center gap-3 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-xl">
                    <div className="p-2 rounded-xl bg-primary/20 text-primary group-hover:scale-110 transition-transform duration-300">
                        <PiggyBank className="h-5 w-5" />
                    </div>
                    <span className="font-bold text-lg tracking-tight text-gradient">
                        {t("app.name")}
                    </span>
                </Link>
            </div>

            <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <nav className="space-y-1">
                    {primaryItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                    isActive
                                        ? "text-white bg-white/[0.08]"
                                        : "text-muted-foreground hover:text-white hover:bg-white/[0.03]"
                                )}
                            >
                                <item.icon className="h-4 w-4 shrink-0" />
                                {item.title}
                            </Link>
                        );
                    })}
                </nav>

                {/* More dropdown */}
                <div className="mt-4 pt-4 border-t border-white/[0.06]">
                    <button
                        onClick={() => setMoreOpen(!moreOpen)}
                        className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/[0.03] transition-all duration-200"
                    >
                        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", moreOpen && "rotate-180")} />
                        More
                    </button>
                    {moreOpen && (
                        <div className="mt-1 ml-2 space-y-0.5 animate-in fade-in slide-in-from-top-2 duration-150">
                            {moreItems.map((item) => {
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                                            isActive
                                                ? "text-white bg-white/[0.05]"
                                                : "text-muted-foreground hover:text-white hover:bg-white/[0.02]"
                                        )}
                                    >
                                        {item.title}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            <div className="px-3 py-4 border-t border-white/[0.06]">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/[0.03] transition-colors"
                >
                    <LogOut className="h-4 w-4" />
                    {t("app.signOut")}
                </button>
            </div>
        </div>
    );
}

/**
 * Bottom Navigation — Mobile Tab Bar
 * Shows 5 primary nav items on small screens.
 * Hidden on md+ where sidebar is visible.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Receipt,
    PiggyBank,
    Target,
    Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
    { label: "Home", href: "/", icon: LayoutDashboard },
    { label: "Spend", href: "/daily", icon: Receipt },
    { label: "Budget", href: "/budgets", icon: PiggyBank },
    { label: "Goals", href: "/goals", icon: Target },
    { label: "More", href: "/settings", icon: Settings },
];

export function BottomNav() {
    const pathname = usePathname();

    return (
        <nav
            className={cn(
                "fixed inset-x-0 bottom-0 z-50 md:hidden",
                "glass border-t border-white/[0.06]",
                "safe-area-bottom"
            )}
            aria-label="Primary"
        >
            <ul className="flex items-center justify-around h-16">
                {tabs.map((tab) => {
                    const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                    return (
                        <li key={tab.href} className="flex-1">
                            <Link
                                href={tab.href}
                                className={cn(
                                    "flex flex-col items-center justify-center h-full w-full gap-0.5 transition-colors duration-200 select-none",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-white"
                                )}
                            >
                                <tab.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
    LayoutDashboard,
    Receipt,
    PiggyBank,
    Settings,
    LogOut,
    Menu,
    Target,
    FileText,
    CreditCard,
    Tag,
} from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";

export function MobileNav() {
    const pathname = usePathname();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const t = useTranslations();

    const sidebarItems = [
        { title: t("nav.dashboard"), href: "/", icon: LayoutDashboard },
        { title: t("nav.transactions"), href: "/transactions", icon: Receipt },
        { title: t("nav.budgets"), href: "/budgets", icon: PiggyBank },
        { title: t("nav.goals"), href: "/goals", icon: Target },
        { title: t("nav.bills"), href: "/bills", icon: FileText },
        { title: t("nav.accounts"), href: "/accounts", icon: CreditCard },
        { title: t("nav.categories"), href: "/categories", icon: Tag },
        { title: t("nav.settings"), href: "/settings", icon: Settings },
    ];

    async function handleLogout() {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    }

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground hover:text-white">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">{t("app.toggleMenu")}</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px] border-r border-white/[0.08] bg-black/95 backdrop-blur-xl p-0">
                <div className="flex flex-col h-full">
                    <SheetHeader className="p-6 border-b border-white/[0.08]">
                        <SheetTitle className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary/20 text-primary">
                                <PiggyBank className="h-6 w-6" />
                            </div>
                            <span className="font-bold text-xl tracking-tight text-white">
                                {t("app.name")}
                            </span>
                        </SheetTitle>
                    </SheetHeader>

                    <div className="flex-1 px-4 py-6 overflow-y-auto">
                        <nav className="space-y-1">
                            {sidebarItems.map((item, index) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={index}
                                        href={item.href}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-300",
                                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                                            isActive
                                                ? "text-white bg-white/[0.05] shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                                                : "text-muted-foreground hover:text-white hover:bg-white/[0.02]"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="active-pill-mobile"
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

                    <div className="p-6 border-t border-white/[0.08]">
                        <Button
                            variant="ghost"
                            className="w-full justify-start gap-3 rounded-xl hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4" />
                            {t("app.signOut")}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

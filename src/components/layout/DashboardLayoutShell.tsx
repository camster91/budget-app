/**
 * App Shell: Desktop Sidebar + Mobile Bottom Nav
 */
"use client";

import { Sidebar } from "./sidebar";
import { BottomNav } from "./BottomNav";

interface DashboardLayoutShellProps {
    children: React.ReactNode;
}

export function DashboardLayoutShell({ children }: DashboardLayoutShellProps) {
    return (
        <div className="flex min-h-screen">
            {/* Desktop sidebar */}
            <aside className="hidden md:block fixed inset-y-0 left-0 z-40 w-64">
                <Sidebar />
            </aside>

            {/* Main content */}
            <main className="flex-1 md:ml-64 pb-20 md:pb-0">
                {children}
            </main>

            {/* Mobile bottom nav */}
            <BottomNav />
        </div>
    );
}

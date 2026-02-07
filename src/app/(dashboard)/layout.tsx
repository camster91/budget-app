import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            <div className="hidden md:block">
                <Sidebar />
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto">
                <header className="flex h-14 items-center gap-4 border-b bg-card px-6">
                    <h1 className="text-lg font-semibold">Dashboard</h1>
                    {/* Add Mobile Sidebar Trigger here later */}
                    <div className="ml-auto flex items-center gap-4">
                        {/* Add UserNav or ThemeToggle here */}
                    </div>
                </header>
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}

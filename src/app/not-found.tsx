import Link from "next/link";
import { PiggyBank } from "lucide-react";

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background bg-grid relative overflow-hidden">
            <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[130px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-violet-500/10 blur-[130px] rounded-full pointer-events-none" />

            <div className="relative flex flex-col items-center text-center px-4">
                <div className="p-3 rounded-2xl bg-primary/20 text-primary mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                    <PiggyBank className="h-8 w-8" />
                </div>
                <div className="text-8xl font-black text-gradient mb-4 tracking-tight">404</div>
                <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
                <p className="text-muted-foreground text-sm mb-8 max-w-xs">
                    This page doesn&apos;t exist or may have been moved.
                </p>
                <Link
                    href="/"
                    className="px-6 py-3 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:opacity-90 transition"
                >
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
}

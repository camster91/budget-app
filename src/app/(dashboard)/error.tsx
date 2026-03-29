"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-[70vh] w-full flex-col items-center justify-center gap-4 text-center px-4">
            <div className="p-4 rounded-2xl bg-red-500/10 text-red-400 mb-2">
                <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
            <p className="text-muted-foreground text-sm max-w-sm">
                An error occurred while loading this page. Your data is safe — try refreshing or go back to the dashboard.
            </p>
            <div className="flex items-center gap-3 mt-4">
                <Link
                    href="/"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.1] text-sm font-bold text-muted-foreground hover:text-white hover:bg-white/[0.04] transition-colors"
                >
                    <Home className="h-4 w-4" />
                    Dashboard
                </Link>
                <Button onClick={reset} className="gap-2 rounded-xl">
                    <RotateCcw className="h-4 w-4" />
                    Try again
                </Button>
            </div>
        </div>
    );
}

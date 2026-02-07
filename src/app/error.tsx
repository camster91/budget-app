"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-[80vh] w-full flex-col items-center justify-center gap-4 text-center">
            <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-2">
                <AlertCircle className="h-8 w-8" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Something went wrong!</h2>
            <p className="text-muted-foreground max-w-md">
                We encountered an error while loading this page. This might be due to a temporary glitch or connection issue.
            </p>
            <div className="flex items-center gap-4 mt-4">
                <Button
                    variant="outline"
                    onClick={() => window.location.href = '/'}
                >
                    Go Home
                </Button>
                <Button
                    onClick={
                        // Attempt to recover by trying to re-render the segment
                        () => reset()
                    }
                    className="gap-2"
                >
                    <RotateCcw className="h-4 w-4" />
                    Try again
                </Button>
            </div>
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-left max-w-2xl w-full overflow-auto">
                    <p className="font-mono text-xs text-destructive">{error.message}</p>
                    <pre className="mt-2 text-[10px] text-muted-foreground break-all whitespace-pre-wrap">
                        {error.stack}
                    </pre>
                </div>
            )}
        </div>
    );
}

"use client";

import { useEffect, useState } from "react";
import { flushOfflineQueue, getOfflineQueue } from "@/lib/offlineSync";
import { createTransaction } from "@/app/_actions/transactions";
import { toast } from "sonner";
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineSyncManager() {
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        setIsOnline(navigator.onLine);
        
        const updateQueueCount = async () => {
            try {
                const queue = await getOfflineQueue();
                setPendingCount(queue.length);
            } catch (err) {
                console.error(err);
            }
        };

        updateQueueCount();

        const handleOnline = async () => {
            setIsOnline(true);
            setIsSyncing(true);
            let count = 0;
            await flushOfflineQueue(async (item) => {
                if (item.type === "TRANSACTION_CREATE") {
                    const formData = new FormData();
                    formData.append("type", item.payload.type);
                    formData.append("amount", item.payload.amount);
                    formData.append("description", item.payload.description);
                    formData.append("date", item.payload.date);
                    formData.append("isDiscretionary", item.payload.isDiscretionary);
                    if (item.payload.categoryId) formData.append("categoryId", item.payload.categoryId);
                    else if (item.payload.category) formData.append("category", item.payload.category);

                    const res = await createTransaction(formData);
                    if (res.success) count++;
                    return res.success;
                }
                return false;
            });
            setIsSyncing(false);
            await updateQueueCount();
            if (count > 0) {
                toast.success(`Synced ${count} offline transactions!`);
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 3000);
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            updateQueueCount();
        };

        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);

        const interval = setInterval(updateQueueCount, 5000);

        if (navigator.onLine) {
            handleOnline();
        } else {
            handleOffline();
        }

        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            clearInterval(interval);
        };
    }, []);

    const visible = !isOnline || isSyncing || pendingCount > 0 || showSuccess;

    if (!visible) return null;

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div
                className={cn(
                    "flex items-center gap-2.5 px-3 py-1.5 rounded-full border shadow-lg backdrop-blur-md text-xs font-semibold select-none transition-all duration-300",
                    !isOnline
                        ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        : isSyncing
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        : showSuccess
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : "bg-zinc-800/80 border-zinc-700/50 text-zinc-300"
                )}
            >
                {!isOnline ? (
                    <>
                        <WifiOff className="h-3.5 w-3.5 animate-pulse text-rose-400" />
                        <span>Offline mode ({pendingCount} pending)</span>
                    </>
                ) : isSyncing ? (
                    <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin text-amber-400" />
                        <span>Syncing transactions...</span>
                    </>
                ) : showSuccess ? (
                    <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>All synced!</span>
                    </>
                ) : (
                    <>
                        <Wifi className="h-3.5 w-3.5 text-zinc-400" />
                        <span>Connection ready ({pendingCount} pending)</span>
                    </>
                )}
            </div>
        </div>
    );
}

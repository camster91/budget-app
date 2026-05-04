"use client";

import { useEffect } from "react";
import { flushOfflineQueue } from "@/lib/offlineSync";
import { createTransaction } from "@/app/_actions/transactions";
import { toast } from "sonner";

export function OfflineSyncManager() {
    useEffect(() => {
        const handleOnline = async () => {
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
            if (count > 0) {
                toast.success(`Synced ${count} offline transactions!`);
            }
        };

        window.addEventListener("online", handleOnline);
        // Also try to flush on mount if online
        if (navigator.onLine) {
            handleOnline();
        }

        return () => window.removeEventListener("online", handleOnline);
    }, []);

    return null;
}

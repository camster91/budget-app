"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { requestNotificationPermission } from "@/hooks/use-pwa";

export function PushNotifier() {
    const [permission, setPermission] = useState<string>("default");
    const [message, setMessage] = useState<{ title: string; body: string } | null>(null);

    useEffect(() => {
        // Poll for push messages every 5 min
        const interval = setInterval(async () => {
            try {
                const res = await fetch("/api/push/send", { method: "POST" });
                const data = await res.json();
                if (data.success && data.messages && data.messages.length > 0) {
                    const msg = data.messages[0];
                    setMessage(msg);
                    // Also show browser notification if permitted
                    if (Notification.permission === "granted") {
                        new Notification(msg.title, { body: msg.body, icon: "/icon-192.png" });
                    }
                }
            } catch {
                // silently fail
            }
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    async function request() {
        const result = await requestNotificationPermission();
        setPermission(result);
    }

    if (permission === "unsupported") return null;

    return (
        <>
            {permission !== "granted" && (
                <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={request}
                    className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/90 text-white text-sm font-medium shadow-lg hover:bg-primary transition-colors"
                >
                    <Bell className="h-4 w-4" />
                    Enable Notifications
                </motion.button>
            )}

            <AnimatePresence>
                {message && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, x: "-50%" }}
                        animate={{ opacity: 1, y: 0, x: "-50%" }}
                        exit={{ opacity: 0, y: 50, x: "-50%" }}
                        className="fixed bottom-20 left-1/2 z-50 w-[90%] max-w-sm glass-card rounded-2xl p-4 border border-primary/20 shadow-[0_0_30px_rgba(99,102,241,0.15)]"
                    >
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                                <Bell className="h-4 w-4" />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm font-bold text-white/90">{message.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{message.body}</p>
                            </div>
                            <button onClick={() => setMessage(null)} className="text-muted-foreground hover:text-white">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

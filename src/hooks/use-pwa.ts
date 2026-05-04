"use client";

import { useEffect } from "react";

export function usePwaRegistration() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        navigator.serviceWorker
            .register("/sw.js")
            .then((reg) => {
                console.log("SW registered:", reg.scope);
                reg.addEventListener("updatefound", () => {
                    const newWorker = reg.installing;
                    newWorker?.addEventListener("statechange", () => {
                        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                            console.log("New version available — refresh to update");
                        }
                    });
                });
            })
            .catch((err) => console.error("SW registration failed:", err));

        // Beforeinstallprompt for add-to-homescreen
        const handler = (e: Event) => {
            e.preventDefault();
            (window as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).__budgetAppInstallPrompt = e;
        };
        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);
}

export async function triggerInstall() {
    const prompt = (window as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).__budgetAppInstallPrompt;
    if (!prompt) return { outcome: "not-available" as const };
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    delete (window as any /* eslint-disable-line @typescript-eslint/no-explicit-any */).__budgetAppInstallPrompt;
    return { outcome };
}

export async function requestNotificationPermission() {
    if (!("Notification" in window)) return "unsupported" as const;
    if (Notification.permission === "granted") return "granted" as const;
    const result = await Notification.requestPermission();
    return result as "granted" | "denied" | "default";
}

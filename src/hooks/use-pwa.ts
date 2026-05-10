"use client";

import { useEffect } from "react";

const SW_PATH = "/sw.js";

export function usePwaRegistration() {
    useEffect(() => {
        if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

        navigator.serviceWorker
            .register(SW_PATH)
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
            .catch((err: unknown) => {
                // SecurityError (code 18): SW registration fails when the page
                // is behind a redirect (e.g. misconfigured deployment or domain
                // routing). This is a deployment-level issue, not a code bug,
                // so log at debug level to avoid polluting the console.
                const isSecurityError =
                    err instanceof DOMException && err.name === "SecurityError";
                if (isSecurityError) {
                    console.debug("SW registration skipped — page behind redirect:", SW_PATH);
                } else {
                    console.error("SW registration failed:", err);
                }
            });

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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { PiggyBank, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
    const router = useRouter();
    const t = useTranslations("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || t("invalidCredentials"));
                return;
            }
            router.push("/");
            router.refresh();
        } catch {
            setError(t("somethingWentWrong"));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background bg-grid relative overflow-hidden">
            {/* Glows */}
            <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[130px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-violet-500/10 blur-[130px] rounded-full pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="relative w-full max-w-sm mx-auto max-[374px]:mx-2 min-[375px]:mx-4"
            >
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="p-3 rounded-2xl bg-primary/20 text-primary mb-4 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                        <PiggyBank className="h-8 w-8" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gradient tracking-tight">{t("title")}</h1>
                    <p className="text-muted-foreground text-sm mt-1">{t("subtitle")}</p>
                </div>

                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-4 max-[374px]:p-3 min-[375px]:p-6 sm:p-8 shadow-2xl">
                    {error && (
                        <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4 max-[374px]:space-y-3">
                        <div className="space-y-1.5">
                            <label htmlFor="email" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("email")}</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                placeholder={t("emailPlaceholder")}
                                className="w-full px-3 max-[374px]:px-2.5 py-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("password")}</label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="w-full px-3 max-[374px]:px-2.5 py-3 pr-11 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 max-[374px]:py-3 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:opacity-90 transition disabled:opacity-50 mt-2"
                        >
                            {loading ? t("signingIn") : t("signIn")}
                        </button>
                    </form>

                    <p className="mt-6 max-[374px]:mt-4 text-center text-sm text-muted-foreground px-2">
                        {t("noAccount")}{" "}
                        <Link href="/register" className="text-primary hover:text-primary/80 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm">
                            {t("createOne")}
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

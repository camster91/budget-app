import { prisma } from "@/lib/prisma";
import RegisterPageClient from "./RegisterPageClient";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
    // Single-user app: once an account exists, registration is closed
    const userCount = await prisma.user.count();
    if (userCount > 0) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background bg-grid relative overflow-hidden">
                <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[130px] rounded-full pointer-events-none" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[35%] h-[35%] bg-violet-500/10 blur-[130px] rounded-full pointer-events-none" />
                <div className="relative w-full max-w-sm mx-4 text-center">
                    <div className="flex flex-col items-center mb-8">
                        <div className="p-3 rounded-2xl bg-primary/20 text-primary mb-4 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gradient tracking-tight">Budget App</h1>
                    </div>
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-sm p-8 shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-2">Registration Closed</h2>
                        <p className="text-muted-foreground text-sm mb-6">
                            An account already exists on this instance. Please sign in with your existing credentials.
                        </p>
                        <a
                            href="/login"
                            className="inline-block w-full py-3 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold tracking-wide shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:opacity-90 transition"
                        >
                            Go to Sign In
                        </a>
                    </div>
                </div>
            </div>
        );
    }
    return <RegisterPageClient />;
}

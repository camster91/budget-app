"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    Wallet, Receipt, Tag, ChevronRight, ChevronLeft,
    Check, Sparkles, TrendingUp, PiggyBank,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OnboardingClientProps {
    createIncome: (formData: FormData) => Promise<{ success: boolean }>;
    createBill: (formData: FormData) => Promise<{ success: boolean }>;
    createCategory: (formData: FormData) => Promise<{ success: boolean }>;
}

const STEPS = [
    { id: "welcome", title: "Welcome", icon: Sparkles },
    { id: "income", title: "Your Income", icon: Wallet },
    { id: "bills", title: "Your Bills", icon: Receipt },
    { id: "categories", title: "Categories", icon: Tag },
    { id: "done", title: "All Set", icon: Check },
];

export function OnboardingClient({ createIncome, createBill, createCategory }: OnboardingClientProps) {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [incomeName, setIncomeName] = useState("Primary Income");
    const [incomeAmount, setIncomeAmount] = useState("");
    const [incomeFrequency, setIncomeFrequency] = useState("monthly");
    const [incomeDate, setIncomeDate] = useState(new Date().toISOString().slice(0, 10));

    const [bills, setBills] = useState([
        { name: "Rent", amount: "", dueDay: "1" },
        { name: "Phone", amount: "", dueDay: "15" },
    ]);

    const [categories, setCategories] = useState([
        { name: "Groceries", icon: "🛒", color: "#059669" },
        { name: "Coffee & Snacks", icon: "☕", color: "#d97706" },
        { name: "Gas", icon: "⛽", color: "#dc2626" },
        { name: "Dining Out", icon: "🍔", color: "#ea580c" },
        { name: "Shopping", icon: "🛍️", color: "#db2777" },
    ]);

    async function handleNext() {
        if (step === 1 && incomeAmount) {
            setIsSubmitting(true);
            const fd = new FormData();
            fd.append("name", incomeName);
            fd.append("amount", incomeAmount);
            fd.append("frequency", incomeFrequency);
            fd.append("startDate", incomeDate);
            await createIncome(fd);
            setIsSubmitting(false);
        }

        if (step === 2) {
            setIsSubmitting(true);
            for (const bill of bills) {
                if (!bill.amount || !bill.name) continue;
                const fd = new FormData();
                fd.append("name", bill.name);
                fd.append("amount", bill.amount);
                fd.append("dueDay", bill.dueDay);
                fd.append("frequency", "monthly");
                fd.append("categoryId", "");
                fd.append("accountId", "");
                await createBill(fd);
            }
            setIsSubmitting(false);
        }

        if (step === 3) {
            setIsSubmitting(true);
            for (const cat of categories) {
                if (!cat.name) continue;
                const fd = new FormData();
                fd.append("name", cat.name);
                fd.append("icon", cat.icon);
                fd.append("color", cat.color);
                fd.append("type", "expense");
                await createCategory(fd);
            }
            setIsSubmitting(false);
        }

        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            router.push("/daily");
        }
    }

    function handleBack() {
        if (step > 0) setStep(step - 1);
    }

    function updateBill(index: number, field: string, value: string) {
        setBills((prev) => prev.map((b, i) => i === index ? { ...b, [field]: value } : b));
    }

    function updateCategory(index: number, field: string, value: string) {
        setCategories((prev) => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
    }

    const progress = ((step) / (STEPS.length - 1)) * 100;

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
            <div className="w-full max-w-md mb-8">
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <motion.div
                        className="h-full rounded-full bg-primary"
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.5 }}
                    />
                </div>
                <div className="flex justify-between mt-2">
                    {STEPS.map((s, i) => (
                        <div key={s.id} className={`text-[10px] font-bold uppercase tracking-wider ${
                            i <= step ? "text-primary" : "text-muted-foreground"
                        }`}>
                            {s.title}
                        </div>
                    ))}
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-md"
                >
                    {step === 0 && (
                        <div className="text-center space-y-6">
                            <div className="h-20 w-20 rounded-2xl bg-primary/15 text-primary flex items-center justify-center mx-auto">
                                <Sparkles className="h-10 w-10" />
                            </div>
                            <h1 className="text-3xl font-black text-gradient">Welcome to Budget App</h1>
                            <p className="text-muted-foreground">
                                We just need 2 minutes to get your daily budget working.
                            </p>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2 justify-center">
                                    <Wallet className="h-4 w-4 text-primary" /> Add your income
                                </div>
                                <div className="flex items-center gap-2 justify-center">
                                    <Receipt className="h-4 w-4 text-primary" /> Add recurring bills
                                </div>
                                <div className="flex items-center gap-2 justify-center">
                                    <Tag className="h-4 w-4 text-primary" /> Set up categories
                                </div>
                            </div>
                            <Button variant="gradient" size="lg" onClick={handleNext} className="w-full">
                                Get Started <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Wallet className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-bold text-white/90">Your Income</h2>
                            </div>
                            <p className="text-sm text-muted-foreground">This is what funds your daily budget. You can add more later.</p>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name</label>
                                <Input value={incomeName} onChange={(e) => setIncomeName(e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Amount per period</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                    <Input value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} type="number" placeholder="e.g. 4200" className="pl-6" autoFocus />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Frequency</label>
                                    <select value={incomeFrequency} onChange={(e) => setIncomeFrequency(e.target.value)} className="h-10 w-full rounded-md border border-white/[0.08] bg-transparent px-3 text-sm text-white/90">
                                        <option value="monthly">Monthly</option>
                                        <option value="biweekly">Bi-weekly</option>
                                        <option value="weekly">Weekly</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Start date</label>
                                    <Input type="date" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Receipt className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-bold text-white/90">Your Bills</h2>
                            </div>
                            <p className="text-sm text-muted-foreground">These are subtracted from your income to calculate daily allowance.</p>
                            {bills.map((bill, i) => (
                                <div key={i} className="glass-card rounded-xl p-4 space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name</label>
                                            <Input value={bill.name} onChange={(e) => updateBill(i, "name", e.target.value)} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Amount</label>
                                            <Input value={bill.amount} onChange={(e) => updateBill(i, "amount", e.target.value)} type="number" placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Due day of month</label>
                                        <Input value={bill.dueDay} onChange={(e) => updateBill(i, "dueDay", e.target.value)} type="number" min="1" max="31" />
                                    </div>
                                </div>
                            ))}
                            <Button variant="ghost" size="sm" onClick={() => setBills([...bills, { name: "", amount: "", dueDay: "1" }])}>
                                + Add another bill
                            </Button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-2">
                                <Tag className="h-5 w-5 text-primary" />
                                <h2 className="text-xl font-bold text-white/90">Categories</h2>
                            </div>
                            <p className="text-sm text-muted-foreground">Pre-filled suggestions. Edit or add your own.</p>
                            {categories.map((cat, i) => (
                                <div key={i} className="flex items-center gap-3">
                                    <Input value={cat.icon} onChange={(e) => updateCategory(i, "icon", e.target.value)} className="w-14 text-center" maxLength={2} />
                                    <Input value={cat.name} onChange={(e) => updateCategory(i, "name", e.target.value)} placeholder="Category name" className="flex-1" />
                                    <input type="color" value={cat.color} onChange={(e) => updateCategory(i, "color", e.target.value)} className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer" />
                                </div>
                            ))}
                            <Button variant="ghost" size="sm" onClick={() => setCategories([...categories, { name: "", icon: "📌", color: "#6366f1" }])}>
                                + Add category
                            </Button>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="text-center space-y-6">
                            <div className="h-20 w-20 rounded-full bg-emerald-500/15 text-emerald-400 flex items-center justify-center mx-auto">
                                <Check className="h-10 w-10" />
                            </div>
                            <h1 className="text-3xl font-black text-gradient">You're all set!</h1>
                            <p className="text-muted-foreground">Your daily budget is now live. Any unused money rolls over to tomorrow.</p>
                            <div className="grid grid-cols-3 gap-3 text-center">
                                <div className="p-3 rounded-xl bg-white/[0.03]">
                                    <TrendingUp className="h-5 w-5 text-primary mx-auto mb-1" />
                                    <p className="text-xs text-muted-foreground">Track spending</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03]">
                                    <PiggyBank className="h-5 w-5 text-emerald-400 mx-auto mb-1" />
                                    <p className="text-xs text-muted-foreground">Save more</p>
                                </div>
                                <div className="p-3 rounded-xl bg-white/[0.03]">
                                    <Sparkles className="h-5 w-5 text-primary mx-auto mb-1" />
                                    <p className="text-xs text-muted-foreground">Get insights</p>
                                </div>
                            </div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>

            {step > 0 && step < STEPS.length - 1 && (
                <div className="w-full max-w-md mt-8 flex gap-3">
                    <Button variant="ghost" onClick={handleBack} className="flex-1">
                        <ChevronLeft className="h-4 w-4 mr-1" /> Back
                    </Button>
                    <Button variant="gradient" onClick={handleNext} disabled={isSubmitting || (step === 1 && !incomeAmount)} className="flex-[2]">
                        {isSubmitting ? "Saving..." : step === STEPS.length - 2 ? "Finish" : "Continue"}
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            )}

            {step === STEPS.length - 1 && (
                <div className="w-full max-w-md mt-8">
                    <Button variant="gradient" size="lg" onClick={handleNext} className="w-full">
                        Go to Daily Spend <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            )}
        </div>
    );
}

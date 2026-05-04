"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Camera, Tag, Hash, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, cn } from "@/lib/utils";
import { categorizeTransaction } from "@/lib/categorization/rulesEngine";

interface Category {
    id: string;
    name: string;
    rules: string | null;
    color?: string | null;
    dailyCap?: number | null;
}

interface QuickAddFormProps {
    onAdd: (formData: FormData) => Promise<any>;
    categories?: Category[];
}

export function QuickAddForm({ onAdd, categories = [] }: QuickAddFormProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");
    const [categoryId, setCategoryId] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAutoSelected, setIsAutoSelected] = useState(false);

    // Auto-categorize as the user types
    useEffect(() => {
        if (!description.trim() || !categories.length) {
            if (isAutoSelected) {
                setCategoryId("");
                setIsAutoSelected(false);
            }
            return;
        }

        const suggestedId = categorizeTransaction(description, categories as any);
        if (suggestedId) {
            setCategoryId(suggestedId);
            setIsAutoSelected(true);
        } else if (isAutoSelected) {
            // Only clear if it was an auto-selection, don't clear if user manually picked
            setCategoryId("");
            setIsAutoSelected(false);
        }
    }, [description, categories, isAutoSelected]);

    const selectedCategory = categories.find((c) => c.id === categoryId);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!amount) return;

        setIsSubmitting(true);
        const formData = new FormData();
        formData.append("amount", amount);
        formData.append("description", description || "Quick spend");
        if (categoryId) formData.append("categoryId", categoryId);

        await onAdd(formData);
        setAmount("");
        setDescription("");
        setCategoryId("");
        setIsAutoSelected(false);
        setIsSubmitting(false);
    }

    // Quick amount buttons
    const quickAmounts = [5, 10, 15, 20, 25, 50];

    return (
        <div className="relative">
            <AnimatePresence>
                {!isOpen ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        <Button
                            onClick={() => setIsOpen(true)}
                            variant="gradient"
                            size="lg"
                            className="w-full h-14 text-lg font-bold gap-2 shadow-[0_0_30px_rgba(99,102,241,0.3)]"
                        >
                            <Plus className="h-5 w-5" />
                            Quick Spend
                        </Button>
                    </motion.div>
                ) : (
                    <motion.form
                        key="form"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        onSubmit={handleSubmit}
                        className="glass-card rounded-2xl p-5 space-y-4"
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Quick Spend</h3>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => setIsOpen(false)}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                        {/* Quick amounts */}
                        <div className="flex flex-wrap gap-2">
                            {quickAmounts.map((a) => (
                                <button
                                    key={a}
                                    type="button"
                                    onClick={() => setAmount(a.toString())}
                                    className={cn(
                                        "px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                                        amount === a.toString()
                                            ? "bg-primary text-white shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                                            : "bg-white/[0.05] text-muted-foreground hover:bg-white/[0.08]"
                                    )}
                                >
                                    ${a}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-[1fr_2fr] gap-3">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="pl-6 h-11"
                                    autoFocus
                                />
                            </div>
                            <Input
                                placeholder="Coffee, Gas, Lunch..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="h-11"
                            />
                        </div>

                        {categories.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex flex-wrap gap-2">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategoryId(categoryId === cat.id ? "" : cat.id)}
                                            className={cn(
                                                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all relative",
                                                categoryId === cat.id
                                                    ? "ring-1 ring-primary/50 text-white"
                                                    : "text-muted-foreground hover:text-white/80"
                                            )}
                                            style={categoryId === cat.id ? { backgroundColor: cat.color + "33" } : undefined}
                                        >
                                            {cat.dailyCap && (
                                                <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-amber-400 ring-1 ring-background" title={`Cap: $${cat.dailyCap}/day`} />
                                            )}
                                            {categoryId === cat.id && isAutoSelected && (
                                                <Sparkles className="h-3 w-3 animate-pulse text-primary" />
                                            )}
                                            {!isAutoSelected || categoryId !== cat.id ? <Tag className="h-3 w-3" /> : null}
                                            {cat.name}
                                        </button>
                                    ))}
                                </div>
                                {selectedCategory?.dailyCap && (
                                    <p className="text-xs text-amber-400 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Daily cap for {selectedCategory.name}: {formatCurrency(selectedCategory.dailyCap)}
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                variant="gradient"
                                className="flex-1 h-11 font-bold"
                                disabled={isSubmitting || !amount}
                            >
                                {isSubmitting ? "Adding..." : `Spend ${amount ? formatCurrency(parseFloat(amount)) : "$0.00"}`}
                            </Button>
                        </div>
                    </motion.form>
                )}
            </AnimatePresence>
        </div>
    );
}

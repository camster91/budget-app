"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import { TrendingUp, Zap, CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface LearnedRule {
    merchant: string;
    categoryId: string;
    categoryName: string;
    hits: number;
    confidence: number;
}

interface SuggestedBill {
    name: string;
    categoryId: string;
    categoryName: string;
    avgAmount: number;
    frequency: "monthly" | "biweekly" | "weekly";
    confidence: number;
    accountId: string;
}

function MerchantRuleCard({ rule, onApply, categories, isPending }: { 
    rule: LearnedRule; 
    onApply: (categoryId: string) => void; 
    categories: { id: string; name: string }[];
    isPending: boolean;
}) {
    const [showCats, setShowCats] = useState(false);

    return (
        <Card className="border-white/10 bg-white/[0.02]">
            <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate capitalize">{rule.merchant}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {rule.hits} transaction{rule.hits > 1 ? "s" : ""} → <span className="text-primary font-medium">{rule.categoryName}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        <div className={cn(
                            "text-[10px] font-bold px-2 py-1 rounded-full",
                            rule.confidence >= 0.8 ? "bg-emerald-500/20 text-emerald-400" :
                            rule.confidence >= 0.6 ? "bg-amber-500/20 text-amber-400" :
                            "bg-white/10 text-muted-foreground"
                        )}>
                            {Math.round(rule.confidence * 100)}% sure
                        </div>
                        {!showCats ? (
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs rounded-lg"
                                onClick={() => setShowCats(true)}
                                disabled={isPending}
                            >
                                Change
                            </Button>
                        ) : (
                            <select
                                className="bg-white/[0.05] border border-white/[0.1] rounded-lg px-2 py-1 text-xs text-white h-7"
                                value={rule.categoryId}
                                onChange={(e) => onApply(e.target.value)}
                                disabled={isPending}
                            >
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function SuggestedBillCard({ bill, onCreate, isPending }: { 
    bill: SuggestedBill;
    onCreate: () => void;
    isPending: boolean;
}) {
    const frequencyColors = {
        monthly: "bg-violet-500/20 text-violet-400",
        biweekly: "bg-amber-500/20 text-amber-400",
        weekly: "bg-rose-500/20 text-rose-400",
    };

    return (
        <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
            <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-bold text-white">{bill.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {bill.frequency} · {bill.categoryName}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-base font-bold text-white">{formatCurrency(bill.avgAmount)}</p>
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", frequencyColors[bill.frequency])}>
                            {bill.frequency}
                        </span>
                    </div>
                </div>
                <Button
                    size="sm"
                    className="w-full mt-3 gap-1.5 rounded-lg h-8"
                    onClick={onCreate}
                    disabled={isPending}
                >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {isPending ? "Adding..." : "Add to Bills"}
                </Button>
            </CardContent>
        </Card>
    );
}

interface SmartCategorizationPanelProps {
    learnedRules: LearnedRule[];
    suggestedBills: SuggestedBill[];
    categories: { id: string; name: string }[];
    accounts: { id: string; name: string }[];
    onRuleApplied: () => void;
    onBillCreated: () => void;
}

export function SmartCategorizationPanel({
    learnedRules,
    suggestedBills,
    categories,
    accounts,
    onRuleApplied,
    onBillCreated,
}: SmartCategorizationPanelProps) {
    const [isPending, startTransition] = useTransition();

    function handleApplyRule(rule: LearnedRule, newCategoryId: string) {
        startTransition(async () => {
            toast.success(`Rule updated: "${rule.merchant}" now maps to ${categories.find(c => c.id === newCategoryId)?.name}`);
            onRuleApplied();
        });
    }

    function handleCreateBill(bill: SuggestedBill) {
        startTransition(async () => {
            const { createBill } = await import("@/app/_actions/bills");
            const formData = new FormData();
            formData.set("name", bill.name);
            formData.set("amount", String(bill.avgAmount));
            formData.set("dueDay", "15");
            formData.set("categoryId", bill.categoryId);
            formData.set("accountId", bill.accountId || accounts[0]?.id || "");
            
            const result = await createBill(formData);
            if (result.success) {
                toast.success(`"${bill.name}" added to bills!`);
                onBillCreated();
            } else {
                toast.error(result.error || "Failed to create bill");
            }
        });
    }

    const totalRules = learnedRules.length;
    const highConfidenceCount = learnedRules.filter(r => r.confidence >= 0.8).length;
    const totalSavings = suggestedBills.reduce((s, b) => s + b.avgAmount, 0);

    return (
        <div className="space-y-8">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 mb-1">
                            <TrendingUp className="h-4 w-4 text-violet-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-violet-400">Merchant Rules</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{totalRules}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{highConfidenceCount} high-confidence</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="h-4 w-4 text-amber-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Auto-match</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{highConfidenceCount}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">rules ready to use</p>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles className="h-4 w-4 text-emerald-400" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Suggested Bills</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{suggestedBills.length}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">~{formatCurrency(totalSavings)}/mo</p>
                    </CardContent>
                </Card>
            </div>

            {/* Learned merchant rules */}
            {learnedRules.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">Learned Merchant Rules</h3>
                        <p className="text-xs text-muted-foreground">
                            From {totalRules} recurring merchants in your transaction history
                        </p>
                    </div>
                    <div className="space-y-2">
                        {learnedRules.slice(0, 8).map((rule) => (
                            <MerchantRuleCard
                                key={`${rule.merchant}-${rule.categoryId}`}
                                rule={rule}
                                categories={categories}
                                onApply={(newCatId) => handleApplyRule(rule, newCatId)}
                                isPending={isPending}
                            />
                        ))}
                    </div>
                    {learnedRules.length > 8 && (
                        <p className="text-xs text-muted-foreground text-center py-2">
                            +{learnedRules.length - 8} more rules
                        </p>
                    )}
                </div>
            )}

            {/* Suggested bills from recurring patterns */}
            {suggestedBills.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-white">Detected Recurring Bills</h3>
                        <p className="text-xs text-muted-foreground">
                            Based on {totalRules}+ recurring transactions in your history
                        </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {suggestedBills.slice(0, 6).map((bill, i) => (
                            <SuggestedBillCard
                                key={i}
                                bill={bill}
                                onCreate={() => handleCreateBill(bill)}
                                isPending={isPending}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty state */}
            {learnedRules.length === 0 && suggestedBills.length === 0 && (
                <Card className="border-dashed border-2 border-white/[0.1] bg-transparent">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Sparkles className="h-10 w-10 text-muted-foreground mb-3" />
                        <h3 className="text-white font-bold mb-1">No patterns detected yet</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                            Import more transactions and the AI will learn your spending patterns and suggest bills automatically.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
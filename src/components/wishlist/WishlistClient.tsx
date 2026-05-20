"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
    Plus, Trash2, Link2, Heart, Sparkles, Hourglass, 
    AlertCircle, CheckCircle, TrendingUp, Wallet, ArrowRight, Eye, ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { createWishlistItem, deleteWishlistItem, purchaseWishlistItem } from "@/app/_actions/wishlist";

interface WishlistItem {
    id: string;
    name: string;
    price: number;
    link: string | null;
    priority: string;
    purchased: boolean;
    createdAt: Date | string;
    updatedAt: Date | string;
}

interface Goal {
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
}

interface WishlistClientProps {
    items: WishlistItem[];
    goals: Goal[];
    metrics: {
        dailyAllowance: number;
        avgDailySpend: number;
        accumulatedSurplus: number;
        dailySurplusRate: number;
        currentPacePercent: number;
    };
}

export function WishlistClient({ items, goals, metrics }: WishlistClientProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showAddModal, setShowAddModal] = useState(false);
    const [showPurchaseModal, setShowPurchaseModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<WishlistItem | null>(null);
    const [useEmergency, setUseEmergency] = useState(false);
    const [emergencyGoalId, setEmergencyGoalId] = useState("");
    const [now, setNow] = useState(Date.now());

    // Update 'now' every minute to keep cooling off timers fresh
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    // Filter active vs purchased
    const activeItems = items.filter(item => !item.purchased);
    const purchasedItems = items.filter(item => item.purchased);

    function getCoolingOff(createdAt: Date | string) {
        const createdTime = new Date(createdAt).getTime();
        const elapsed = now - createdTime;
        const coolingPeriod = 48 * 60 * 60 * 1000; // 48 hours
        const remaining = Math.max(0, coolingPeriod - elapsed);
        const percent = Math.min(100, (elapsed / coolingPeriod) * 100);
        return {
            isCooling: remaining > 0,
            remainingHours: Math.ceil(remaining / (1000 * 60 * 60)),
            percent,
        };
    }

    function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            const res = await createWishlistItem(formData);
            if (res.success) {
                toast.success("Added to spending wishlist!");
                setShowAddModal(false);
                router.refresh();
            } else {
                toast.error(res.error || "Failed to add item");
            }
        });
    }

    function handleDelete(id: string) {
        if (!confirm("Are you sure you want to remove this item?")) return;
        startTransition(async () => {
            const res = await deleteWishlistItem(id);
            if (res.success) {
                toast.success("Wishlist item removed.");
                router.refresh();
            } else {
                toast.error(res.error || "Failed to remove item");
            }
        });
    }

    function handlePurchaseConfirm() {
        if (!selectedItem) return;

        startTransition(async () => {
            const res = await purchaseWishlistItem(
                selectedItem.id,
                useEmergency,
                useEmergency ? emergencyGoalId : undefined
            );
            if (res.success) {
                toast.success(`Purchased "${selectedItem.name}"! Transaction logged.`);
                setShowPurchaseModal(false);
                setSelectedItem(null);
                setUseEmergency(false);
                setEmergencyGoalId("");
                router.refresh();
            } else {
                toast.error(res.error || "Purchase failed");
            }
        });
    }

    return (
        <div className="space-y-8">
            {/* Header Block */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black tracking-tight text-gradient">Spending Wishlist</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Implement a 48-hour cooling period on new desires to defeat impulse spending habits.
                    </p>
                </div>
                <Button 
                    onClick={() => setShowAddModal(true)}
                    className="rounded-xl bg-primary hover:bg-primary/95 text-white flex items-center gap-2 self-start md:self-auto"
                >
                    <Plus className="h-4 w-4" /> Add Wishlist Item
                </Button>
            </div>

            {/* Discipline stats banner */}
            <div className="glass-card p-6 rounded-2xl border border-white/[0.05] grid md:grid-cols-3 gap-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Daily Surplus Rate
                        </p>
                        <p className="text-xl font-extrabold text-white">
                            {formatCurrency(metrics.dailySurplusRate)}/day
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                        <Wallet className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Available Surplus Balance
                        </p>
                        <p className="text-xl font-extrabold text-white">
                            {formatCurrency(metrics.accumulatedSurplus)}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Impulse Protection Rule
                        </p>
                        <p className="text-sm font-semibold text-white/90">
                            48h Cooling off period active
                        </p>
                    </div>
                </div>
            </div>

            {/* Active Wishlist Grid */}
            <div>
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Heart className="h-4 w-4 text-primary" /> Active Desires ({activeItems.length})
                </h3>

                {activeItems.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl bg-white/[0.01] border border-white/[0.04]">
                        <p className="text-muted-foreground text-sm">Your wishlist is empty. Add larger purchases here to evaluate them first.</p>
                    </div>
                ) : (
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <AnimatePresence mode="popLayout">
                            {activeItems.map((item) => {
                                const { isCooling, remainingHours, percent } = getCoolingOff(item.createdAt);
                                const canAfford = metrics.accumulatedSurplus >= item.price;
                                const isPaceHealthy = metrics.currentPacePercent >= 90;
                                const isReady = !isCooling && canAfford && isPaceHealthy;

                                // Days to save
                                const daysToSave = metrics.dailySurplusRate > 0 
                                    ? Math.ceil((item.price - metrics.accumulatedSurplus) / metrics.dailySurplusRate)
                                    : null;

                                return (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, y: 15 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className={cn(
                                            "glass-card p-5 rounded-2xl border border-white/[0.05] flex flex-col justify-between relative overflow-hidden",
                                            isReady && "border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.05)]",
                                            isCooling && "border-amber-500/20"
                                        )}
                                    >
                                        <div>
                                            <div className="flex items-center justify-between mb-3">
                                                <span className={cn(
                                                    "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                                                    item.priority === "high" ? "bg-rose-500/20 text-rose-400" :
                                                    item.priority === "medium" ? "bg-amber-500/20 text-amber-400" :
                                                    "bg-zinc-500/20 text-zinc-400"
                                                )}>
                                                    {item.priority} priority
                                                </span>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon"
                                                    onClick={() => handleDelete(item.id)}
                                                    className="h-7 w-7 text-muted-foreground hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <h4 className="font-bold text-white text-base truncate mb-1">{item.name}</h4>
                                            <p className="text-xl font-extrabold text-white mb-4">
                                                {formatCurrency(item.price)}
                                            </p>

                                            {/* Link */}
                                            {item.link && (
                                                <a 
                                                    href={item.link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mb-4"
                                                >
                                                    <Link2 className="h-3.5 w-3.5" /> View Product Page
                                                </a>
                                            )}

                                            {/* Recommendation Box */}
                                            <div className="mt-2 mb-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                                                {isCooling ? (
                                                    <div className="space-y-2">
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-amber-400 flex items-center gap-1 font-semibold">
                                                                <Hourglass className="h-3.5 w-3.5" /> Impulse Cooling
                                                            </span>
                                                            <span className="text-muted-foreground">{remainingHours}h remaining</span>
                                                        </div>
                                                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${percent}%` }} />
                                                        </div>
                                                    </div>
                                                ) : !canAfford ? (
                                                    <div className="flex items-start gap-2 text-xs">
                                                        <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="font-semibold text-white/90">Accumulating Surplus</p>
                                                            <p className="text-muted-foreground mt-0.5">
                                                                {daysToSave !== null && daysToSave > 0 
                                                                    ? `Need ${formatCurrency(item.price - metrics.accumulatedSurplus)} more. Approx. ${daysToSave} days of discipline.`
                                                                    : "Reduce discretionary spend below allowance to start saving surplus."}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : !isPaceHealthy ? (
                                                    <div className="flex items-start gap-2 text-xs">
                                                        <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="font-semibold text-rose-400">Pace Warning</p>
                                                            <p className="text-muted-foreground mt-0.5">
                                                                You have the surplus, but your daily spending pace is low ({metrics.currentPacePercent}%). Focus on restoring budget pace before spending.
                                                            </p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-start gap-2 text-xs">
                                                        <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="font-semibold text-emerald-400">Ready to Purchase</p>
                                                            <p className="text-muted-foreground mt-0.5">
                                                                Protected by 48h delay, surplus fully funded, and spending pace is healthy.
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-2 mt-4">
                                            <Button
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setUseEmergency(false);
                                                    setShowPurchaseModal(true);
                                                }}
                                                disabled={isCooling && item.priority !== "high"}
                                                className={cn(
                                                    "w-full rounded-xl text-xs font-semibold py-2.5",
                                                    isReady 
                                                        ? "bg-emerald-500 hover:bg-emerald-600 text-white" 
                                                        : "bg-white/[0.05] hover:bg-white/[0.08] text-white/95"
                                                )}
                                            >
                                                Purchase Item
                                            </Button>

                                            {item.priority === "high" && (
                                                <Button
                                                    onClick={() => {
                                                        setSelectedItem(item);
                                                        setUseEmergency(true);
                                                        if (goals.length > 0) setEmergencyGoalId(goals[0].id);
                                                        setShowPurchaseModal(true);
                                                    }}
                                                    className="w-full rounded-xl text-xs font-semibold py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 flex items-center justify-center gap-1.5"
                                                >
                                                    <ShieldAlert className="h-3.5 w-3.5" /> Inject Emergency Savings
                                                </Button>
                                            )}
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            {/* Purchased Items Section */}
            {purchasedItems.length > 0 && (
                <div className="pt-6 border-t border-white/[0.06]">
                    <h3 className="text-lg font-bold text-white/80 mb-4 flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-400" /> Acquired Desires ({purchasedItems.length})
                    </h3>

                    <div className="space-y-3 max-w-3xl">
                        {purchasedItems.map((item) => (
                            <div 
                                key={item.id}
                                className="glass-card p-4 rounded-xl border border-white/[0.03] flex items-center justify-between opacity-60 hover:opacity-90 transition-opacity"
                            >
                                <div>
                                    <h4 className="font-bold text-white text-sm line-through decoration-white/40">{item.name}</h4>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Acquired on {new Date(item.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <span className="font-bold text-sm text-white/80">
                                    {formatCurrency(item.price)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Add Item Dialog */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add to Wishlist</DialogTitle>
                        <DialogDescription>
                            Enter the details of your desired item. We will lock it for a 48h cooling period to safeguard against impulse purchases.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreate} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Item Name</label>
                            <Input 
                                name="name" 
                                placeholder="E.g., iPad Pro, Winter Coat" 
                                required 
                                className="bg-white/[0.03]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Price (Dollars)</label>
                            <Input 
                                name="price" 
                                type="number" 
                                step="0.01" 
                                placeholder="0.00" 
                                required 
                                className="bg-white/[0.03]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product URL Link (Optional)</label>
                            <Input 
                                name="link" 
                                type="url" 
                                placeholder="https://..." 
                                className="bg-white/[0.03]"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Priority / Urgency</label>
                            <select 
                                name="priority"
                                className="w-full h-10 rounded-lg border border-white/[0.1] bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                defaultValue="medium"
                            >
                                <option value="low">Low Priority (Casual Desires)</option>
                                <option value="medium">Medium Priority (Standard Needs)</option>
                                <option value="high">High Priority (Urgent / Emergency Eligible)</option>
                            </select>
                        </div>

                        <div className="flex gap-3 justify-end pt-4">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => setShowAddModal(false)}
                                className="rounded-xl text-xs"
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                disabled={isPending}
                                className="rounded-xl text-xs bg-primary hover:bg-primary/95 text-white"
                            >
                                {isPending ? "Adding..." : "Add to Wishlist"}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Purchase Confirmation Dialog */}
            <Dialog open={showPurchaseModal} onOpenChange={setShowPurchaseModal}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Wishlist Purchase</DialogTitle>
                        <DialogDescription>
                            Are you ready to finalize the purchase of {selectedItem?.name} for {selectedItem && formatCurrency(selectedItem.price)}?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-4">
                        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                            <div className="flex items-center justify-between mb-3 text-xs">
                                <span className="text-muted-foreground font-medium">Use Emergency Savings Injection</span>
                                <input 
                                    type="checkbox"
                                    checked={useEmergency}
                                    onChange={(e) => setUseEmergency(e.target.checked)}
                                    disabled={selectedItem?.priority !== "high"}
                                    className="h-4 w-4 rounded border-white/[0.1] bg-zinc-950 accent-primary focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            {useEmergency ? (
                                <div className="space-y-2 mt-3 animate-in fade-in-0 duration-200">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                        Select Savings Goal Source
                                    </label>
                                    {goals.length === 0 ? (
                                        <p className="text-xs text-rose-400 font-semibold">No active savings goals found. Create a savings goal first.</p>
                                    ) : (
                                        <select 
                                            value={emergencyGoalId}
                                            onChange={(e) => setEmergencyGoalId(e.target.value)}
                                            className="w-full h-10 rounded-lg border border-white/[0.1] bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
                                        >
                                            {goals.map(goal => (
                                                <option key={goal.id} value={goal.id}>
                                                    {goal.name} (Available: {formatCurrency(goal.currentAmount)})
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground mt-2">
                                    {selectedItem?.priority !== "high" 
                                        ? "Only High Priority wishlist items are eligible for emergency savings fund injections."
                                        : "Leave unchecked to fund the item from standard discretionary surplus allowance."
                                    }
                                </p>
                            )}
                        </div>

                        <div className="flex gap-3 justify-end pt-4">
                            <Button 
                                type="button" 
                                variant="ghost" 
                                onClick={() => {
                                    setShowPurchaseModal(false);
                                    setSelectedItem(null);
                                }}
                                className="rounded-xl text-xs"
                            >
                                Cancel
                            </Button>
                            <Button 
                                onClick={handlePurchaseConfirm}
                                disabled={isPending || (useEmergency && goals.length === 0)}
                                className="rounded-xl text-xs bg-emerald-500 hover:bg-emerald-600 text-white"
                            >
                                {isPending ? "Purchasing..." : "Confirm Purchase"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

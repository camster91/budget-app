"use client";

import { useState, useTransition, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tag, Plus, X, ArrowUpCircle, ArrowDownCircle, Pencil, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createCategory, deleteCategory, updateCategory } from "@/app/_actions/categories";

interface Rule {
    keyword: string;
    type: 'contains' | 'equals';
}

interface Category {
    id: string;
    name: string;
    icon: string | null;
    color: string | null;
    type: string;
    rules: string | null;
    _count: { transactions: number };
}

const PRESET_COLORS = [
    "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
    "#f97316", "#eab308", "#22c55e", "#06b6d4",
];

function parseRules(rulesStr: string | null): Rule[] {
    if (!rulesStr) return [];
    try {
        const p = JSON.parse(rulesStr);
        if (Array.isArray(p) && p.length > 0 && typeof p[0] === 'object' && 'keyword' in p[0]) {
            return p as Rule[];
        }
        if (Array.isArray(p)) {
            return p.map((s: unknown) => ({ keyword: String(s), type: 'contains' as const }));
        }
        return [];
    }
    catch { return []; }
}

// ─── Category Card (view mode) ───────────────────────────────────────────────

function CategoryCard({
    category,
    onEdit,
    onDelete,
    isPending
}: {
    category: Category;
    onEdit: () => void;
    onDelete: () => void;
    isPending: boolean;
}) {
    const rules = parseRules(category.rules);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <Card className="relative overflow-hidden group">
                <div
                    className="absolute top-0 left-0 w-1 h-full rounded-l-2xl"
                    style={{ backgroundColor: category.color || "#6366f1" }}
                />
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pl-6">
                    <div className="flex items-center gap-2">
                        {category.icon && <span className="text-xl">{category.icon}</span>}
                        <div>
                            <CardTitle className="text-sm font-bold text-white">{category.name}</CardTitle>
                            <div className="flex items-center gap-1 mt-0.5">
                                {category.type === "income" ? (
                                    <ArrowUpCircle className="h-3 w-3 text-emerald-400" />
                                ) : (
                                    <ArrowDownCircle className="h-3 w-3 text-rose-400" />
                                )}
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                    {category.type}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:text-blue-400"
                            onClick={onEdit}
                            disabled={isPending}
                        >
                            <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:text-red-400"
                            onClick={onDelete}
                            disabled={isPending}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="pl-6 pt-0">
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                            {category._count.transactions} transaction{category._count.transactions !== 1 ? "s" : ""}
                        </span>
                    </div>
                    {rules.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {rules.slice(0, 3).map((r, i) => (
                                <span key={i} className="text-[10px] bg-white/[0.05] border border-white/[0.08] rounded-md px-1.5 py-0.5 text-muted-foreground font-medium flex gap-1">
                                    <span className="opacity-50">{r.type === 'equals' ? '=' : '~'}</span>
                                    <span>{r.keyword}</span>
                                </span>
                            ))}
                            {rules.length > 3 && (
                                <span className="text-[10px] text-muted-foreground bg-white/[0.02] rounded-md px-1.5 py-0.5">+{rules.length - 3} more</span>
                            )}
                        </div>
                    )}
                    {rules.length === 0 && (
                        <p className="text-[10px] text-muted-foreground mt-2 italic">No auto-match rules</p>
                    )}
                </CardContent>
            </Card>
        </motion.div>
    );
}

// ─── Edit Form (inline) ───────────────────────────────────────────────────────

function EditCategoryForm({
    category,
    onSave,
    onCancel,
    isPending
}: {
    category: Category;
    onSave: (formData: FormData) => void;
    onCancel: () => void;
    isPending: boolean;
}) {
    const [name, setName] = useState(category.name);
    const [icon, setIcon] = useState(category.icon || "");
    const [color, setColor] = useState(category.color || PRESET_COLORS[0]);
    const [rules, setRules] = useState<Rule[]>(parseRules(category.rules));
    const [newRuleKeyword, setNewRuleKeyword] = useState("");
    const [newRuleType, setNewRuleType] = useState<'contains' | 'equals'>("contains");

    function handleAddRule() {
        if (!newRuleKeyword.trim()) return;
        setRules([...rules, { keyword: newRuleKeyword.trim(), type: newRuleType }]);
        setNewRuleKeyword("");
    }

    function handleRemoveRule(index: number) {
        setRules(rules.filter((_, i) => i !== index));
    }

    function handleSubmit() {
        const formData = new FormData();
        formData.set("name", name);
        formData.set("icon", icon);
        formData.set("color", color);
        formData.set("rules", JSON.stringify(rules));
        onSave(formData);
    }

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
        >
            <Card className="border-blue-500/30 bg-blue-500/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base">Edit: {category.name}</CardTitle>
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:text-emerald-400"
                            onClick={handleSubmit}
                            disabled={isPending}
                        >
                            <Check className="h-3 w-3" />
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={onCancel}
                            disabled={isPending}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <input type="hidden" name="id" value={category.id} />
                        <input type="hidden" name="rules" value={JSON.stringify(rules)} />

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</label>
                            <Input
                                name="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="rounded-xl bg-white/[0.05] border-white/[0.1]"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Icon (emoji)</label>
                            <Input
                                name="icon"
                                value={icon}
                                onChange={(e) => setIcon(e.target.value)}
                                maxLength={2}
                                className="rounded-xl bg-white/[0.05] border-white/[0.1]"
                            />
                        </div>

                        {/* Rule builder */}
                        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Auto-match Rules</label>
                            <div className="flex gap-2">
                                <select
                                    value={newRuleType}
                                    onChange={(e) => setNewRuleType(e.target.value as 'contains' | 'equals')}
                                    className="w-32 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="contains">Contains</option>
                                    <option value="equals">Equals</option>
                                </select>
                                <Input
                                    placeholder="e.g. walmart"
                                    value={newRuleKeyword}
                                    onChange={(e) => setNewRuleKeyword(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddRule();
                                        }
                                    }}
                                    className="flex-1 rounded-xl bg-white/[0.05] border-white/[0.1]"
                                />
                                <Button type="button" onClick={handleAddRule} variant="outline" className="rounded-xl shrink-0">
                                    Add
                                </Button>
                            </div>

                            {rules.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3 p-3 rounded-xl bg-black/20 border border-white/5">
                                    {rules.map((rule, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-xs text-white">
                                            <span className="opacity-60 font-mono">{rule.type}:</span>
                                            <span className="font-bold">{rule.keyword}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRule(idx)}
                                                className="ml-1 opacity-50 hover:opacity-100 hover:text-rose-400"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Color</label>
                            <div className="flex gap-2">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={cn(
                                            "h-7 w-7 rounded-full transition-all",
                                            color === c ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : "opacity-70 hover:opacity-100"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-end">
                            <Button type="submit" disabled={isPending} className="w-full rounded-xl">
                                {isPending ? "Saving..." : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// ─── Create Category Form ─────────────────────────────────────────────────────

function CreateCategoryForm({
    onCancel,
    onSuccess,
    isPending
}: {
    onCancel: () => void;
    onSuccess: () => void;
    isPending: boolean;
}) {
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
    const [rules, setRules] = useState<Rule[]>([]);
    const [newRuleKeyword, setNewRuleKeyword] = useState("");
    const [newRuleType, setNewRuleType] = useState<'contains' | 'equals'>("contains");

    function handleAddRule() {
        if (!newRuleKeyword.trim()) return;
        setRules([...rules, { keyword: newRuleKeyword.trim(), type: newRuleType }]);
        setNewRuleKeyword("");
    }

    function handleRemoveRule(index: number) {
        setRules(rules.filter((_, i) => i !== index));
    }

    function handleCreate(formData: FormData) {
        formData.set("color", selectedColor);
        startTransition(async () => {
            const result = await createCategory(formData);
            if (result?.success) {
                onSuccess();
            }
        });
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
        >
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-base">New Category</CardTitle>
                    <Button variant="ghost" size="icon" onClick={onCancel}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <form action={handleCreate} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <input type="hidden" name="rules" value={JSON.stringify(rules)} />

                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Name</label>
                            <Input name="name" placeholder="e.g. Groceries" required className="rounded-xl bg-white/[0.05] border-white/[0.1]" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Type</label>
                            <select name="type" required className="w-full bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary">
                                <option value="expense">Expense</option>
                                <option value="income">Income</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Icon (emoji)</label>
                            <Input name="icon" placeholder="🛒" maxLength={2} className="rounded-xl bg-white/[0.05] border-white/[0.1]" />
                        </div>

                        {/* Rule builder */}
                        <div className="space-y-2 sm:col-span-2 lg:col-span-4">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Auto-match Rules</label>
                            <div className="flex gap-2">
                                <select
                                    value={newRuleType}
                                    onChange={(e) => setNewRuleType(e.target.value as 'contains' | 'equals')}
                                    className="w-32 bg-white/[0.05] border border-white/[0.1] rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                    <option value="contains">Contains</option>
                                    <option value="equals">Equals</option>
                                </select>
                                <Input
                                    placeholder="e.g. walmart"
                                    value={newRuleKeyword}
                                    onChange={(e) => setNewRuleKeyword(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleAddRule();
                                        }
                                    }}
                                    className="flex-1 rounded-xl bg-white/[0.05] border-white/[0.1]"
                                />
                                <Button type="button" onClick={handleAddRule} variant="outline" className="rounded-xl shrink-0">
                                    Add
                                </Button>
                            </div>

                            {rules.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-3 p-3 rounded-xl bg-black/20 border border-white/5">
                                    {rules.map((rule, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 text-xs text-white">
                                            <span className="opacity-60 font-mono">{rule.type}:</span>
                                            <span className="font-bold">{rule.keyword}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRule(idx)}
                                                className="ml-1 opacity-50 hover:opacity-100 hover:text-rose-400"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Color</label>
                            <div className="flex gap-2">
                                {PRESET_COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setSelectedColor(c)}
                                        className={cn(
                                            "h-7 w-7 rounded-full transition-all",
                                            selectedColor === c ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-110" : "opacity-70 hover:opacity-100"
                                        )}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-end">
                            <Button type="submit" disabled={isPending} className="w-full rounded-xl">
                                {isPending ? "Creating..." : "Create"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CategoriesClientProps {
    categories: Category[];
}

export function CategoriesClient({ categories: initialCategories }: CategoriesClientProps) {
    const router = useRouter();
    const [categories, setCategories] = useState(initialCategories);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [typeFilter, setTypeFilter] = useState<"all" | "expense" | "income">("all");
    const [isPending, startTransition] = useTransition();

    const filtered = typeFilter === "all" ? categories : categories.filter((c) => c.type === typeFilter);
    const expenseCount = categories.filter((c) => c.type === "expense").length;
    const incomeCount = categories.filter((c) => c.type === "income").length;

    function handleCreate(formData: FormData) {
        startTransition(async () => {
            const result = await createCategory(formData);
            if (result.success) {
                setShowCreateForm(false);
                router.refresh();
            }
        });
    }

    function handleUpdate(formData: FormData) {
        const id = formData.get("id") as string;
        startTransition(async () => {
            const result = await updateCategory(id, formData);
            if (result.success) {
                setEditingId(null);
                router.refresh();
            }
        });
    }

    function handleDelete(id: string) {
        startTransition(async () => {
            const result = await deleteCategory(id);
            if (result.success) {
                setCategories((prev) => prev.filter((c) => c.id !== id));
            }
        });
    }

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white mb-1">Categories</h2>
                    <p className="text-muted-foreground text-sm">Organise transactions with custom categories and auto-matching rules.</p>
                </div>
                <Button onClick={() => setShowCreateForm(true)} className="gap-2 rounded-xl self-start md:self-auto">
                    <Plus className="h-4 w-4" />
                    New Category
                </Button>
            </div>

            <AnimatePresence>
                {showCreateForm && (
                    <CreateCategoryForm
                        onCancel={() => setShowCreateForm(false)}
                        onSuccess={() => setShowCreateForm(false)}
                        isPending={isPending}
                    />
                )}
            </AnimatePresence>

            {/* Filter tabs */}
            <div className="flex items-center gap-2">
                {([["all", "All", categories.length], ["expense", "Expenses", expenseCount], ["income", "Income", incomeCount]] as const).map(([v, label, count]) => (
                    <button
                        key={v}
                        onClick={() => setTypeFilter(v)}
                        className={cn(
                            "px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            typeFilter === v
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "text-muted-foreground hover:text-white hover:bg-white/[0.05]"
                        )}
                    >
                        {label} <span className="ml-1 text-xs opacity-60">({count})</span>
                    </button>
                ))}
            </div>

            {!filtered.length && !showCreateForm ? (
                <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed border-2 border-white/[0.1] bg-transparent">
                    <div className="h-16 w-16 rounded-3xl glass flex items-center justify-center mb-6">
                        <Tag className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-white text-lg font-bold mb-2">No categories yet</h3>
                    <p className="text-muted-foreground mb-8 max-w-sm">Create categories to automatically classify your transactions.</p>
                    <Button onClick={() => setShowCreateForm(true)} className="gap-2 rounded-xl">
                        <Plus className="h-4 w-4" />
                        Create First Category
                    </Button>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((cat) => {
                        if (editingId === cat.id) {
                            return (
                                <EditCategoryForm
                                    key={cat.id}
                                    category={cat}
                                    onSave={handleUpdate}
                                    onCancel={() => setEditingId(null)}
                                    isPending={isPending}
                                />
                            );
                        }
                        return (
                            <CategoryCard
                                key={cat.id}
                                category={cat}
                                onEdit={() => setEditingId(cat.id)}
                                onDelete={() => handleDelete(cat.id)}
                                isPending={isPending}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
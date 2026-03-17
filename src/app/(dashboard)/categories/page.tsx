import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CategoriesPage() {
    const categories = await prisma.category.findMany({
        orderBy: { name: "asc" },
    });

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Categories</h2>
            <div className="grid gap-4 md:grid-cols-3">
                {categories.map((cat) => (
                    <Card key={cat.id}>
                        <CardHeader>
                            <CardTitle>{cat.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">Type: {cat.type}</p>
                            <p className="text-xs text-muted-foreground mt-2">Rules: {cat.rules || "No rules defined"}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

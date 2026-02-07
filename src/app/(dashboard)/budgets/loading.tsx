import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function BudgetsLoading() {
    return (
        <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
                <div>
                    <Skeleton className="h-9 w-32 mb-2" />
                    <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i} className="relative overflow-hidden border-white/[0.08] bg-white/[0.01]">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                            <div>
                                <Skeleton className="h-5 w-24 mb-1" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                            <Skeleton className="h-9 w-9 rounded-xl" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between mb-4">
                                <Skeleton className="h-8 w-32" />
                                <Skeleton className="h-3 w-20" />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <Skeleton className="h-3 w-16" />
                                    <Skeleton className="h-3 w-8" />
                                </div>
                                <Skeleton className="h-2 w-full rounded-full" />
                                <div className="flex justify-between pt-1">
                                    <Skeleton className="h-3 w-20" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                <Skeleton className="h-[220px] w-full rounded-2xl" />
            </div>
        </div>
    );
}

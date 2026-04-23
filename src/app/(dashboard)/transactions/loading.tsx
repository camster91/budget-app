import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function TransactionsLoading() {
    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Skeleton className="h-9 w-48 mb-2" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-9 w-32" />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                <Card className="col-span-1 border-white/[0.08] bg-white/[0.01]">
                    <CardHeader>
                        <Skeleton className="h-5 w-24" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-9 w-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-3 w-16" />
                            <Skeleton className="h-9 w-full" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="md:col-span-3 border-white/[0.08] bg-white/[0.01]">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <Skeleton className="h-6 w-24 mb-2" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <Skeleton className="h-8 w-8" />
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-white/[0.05] pb-4">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-24" />
                            </div>
                            {[...Array(8)].map((_, i) => (
                                <div key={i} className="flex justify-between py-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-6 w-20 rounded-lg" />
                                    <Skeleton className="h-4 w-24" />
                                    <Skeleton className="h-4 w-16" />
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

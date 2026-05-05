import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import { getWeeklyReview, getMonthlyReview } from "@/app/_actions/review";
import { ReviewClient } from "./ReviewClient";
import { format, subMonths } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
    const user = await getAuthUser();
    if (!user) redirect("/login");

    const [{ data: weekly }, { data: monthly }] = await Promise.all([
        getWeeklyReview(),
        getMonthlyReview(),
    ]);

    const months = Array.from({ length: 12 }, (_, i) =>
        format(subMonths(new Date(), i), "yyyy-MM")
    );

    return (
        <ReviewClient
            initialWeekly={weekly || null}
            initialMonthly={monthly || null}
            months={months}
        />
    );
}
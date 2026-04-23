import { getWeeklyReview, getMonthlyReview } from "@/app/_actions/review";
import { ReviewClient } from "./ReviewClient";
import { format, subMonths } from "date-fns";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
    const [{ data: weekly }, { data: monthly }] = await Promise.all([
        getWeeklyReview(),
        getMonthlyReview(),
    ]);

    const months = Array.from({ length: 12 }, (_, i) =
        format(subMonths(new Date(), i), "yyyy-MM")
    );

    return (
        <ReviewClient
            initialWeekly={weekly}
            initialMonthly={monthly}
            months={months}
        />
    );
}

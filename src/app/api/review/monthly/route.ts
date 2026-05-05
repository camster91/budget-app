import { getMonthlyReview } from "@/app/_actions/review";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
    const user = await getAuthUser();
    if (!user) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || undefined;

    const result = await getMonthlyReview(month);

    return Response.json(result);
}
export const dynamic = "force-dynamic";

import { exportTransactionsToCSV } from "@/app/_actions/export";
import { safeEmail, safeString, safeNumber, safeDate, zodErrorResponse } from "@/lib/validate";
import { logger } from "@/lib/logger";
import { getAuthUser } from "@/lib/getAuthUser";

export async function GET(req: Request) {
    const user = await getAuthUser();
    if (!user) {
        return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || undefined;

    const res = await exportTransactionsToCSV(month);

    if (!res.success) {
        return Response.json(res, { status: 400 });
    }

    return new Response(res.data!.csv, {
        status: 200,
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="${res.data!.filename}"`,
        },
    });
}

import { exportTransactionsToCSV } from "@/app/_actions/export";

export async function GET(req: Request) {
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

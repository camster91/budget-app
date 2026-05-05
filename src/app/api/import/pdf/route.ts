import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { parseStatement } from "@/lib/parsers";

export const dynamic = "force-dynamic";

// pdf-parse v2 uses a URL or base64 input
// We'll use a data URL approach for the buffer
function bufferToDataUrl(buffer: Buffer): string {
    const base64 = buffer.toString("base64");
    return `data:application/pdf;base64,${base64}`;
}

export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const bank = formData.get("bank") as string || "tangerine";

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const dataUrl = bufferToDataUrl(buffer);
        
        // pdf-parse v2 takes URL or base64 data URL
        const { PDFParse } = await import("pdf-parse");
        const parser = new PDFParse({ url: dataUrl });
        const result = await parser.getText();
        
        const transactions = parseStatement(result.text, bank);
        
        await parser.destroy();

        return NextResponse.json({ success: true, transactions });
    } catch (error) {
        console.error("PDF Parse Error:", error);
        return NextResponse.json({ success: false, error: "Failed to parse PDF" }, { status: 500 });
    }
}
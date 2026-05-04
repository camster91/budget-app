import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "dummy",
});

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { rawText } = await request.json();
        if (!rawText || typeof rawText !== "string") {
            return NextResponse.json({ error: "No text provided" }, { status: 400 });
        }

        const schema = {
            type: Type.OBJECT,
            properties: {
                merchant: {
                    type: Type.STRING,
                    description: "The name of the store or merchant. Usually at the very top.",
                },
                total: {
                    type: Type.NUMBER,
                    description: "The final grand total amount paid.",
                },
                date: {
                    type: Type.STRING,
                    description: "The date of the transaction in YYYY-MM-DD format.",
                },
                items: {
                    type: Type.ARRAY,
                    description: "List of items purchased.",
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            description: { type: Type.STRING },
                            price: { type: Type.NUMBER },
                        },
                    },
                },
            },
            required: ["merchant", "total"],
        };

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Parse this messy receipt OCR text into structured data. Fix obvious OCR typos.\n\nReceipt Text:\n${rawText}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.1,
            },
        });

        if (!response.text) {
            throw new Error("No response from AI");
        }

        const data = JSON.parse(response.text);

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("AI Parse Error:", error);
        return NextResponse.json({ success: false, error: "Failed to parse receipt" }, { status: 500 });
    }
}

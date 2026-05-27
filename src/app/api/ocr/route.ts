import { NextResponse } from "next/server";
import { safeEmail, safeString, safeNumber, safeDate, zodErrorResponse } from "@/lib/validate";
import { logger } from "@/lib/logger";
import { getAuthUser } from "@/lib/getAuthUser";
import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (ai) return ai;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required");
  }
  ai = new GoogleGenAI({ apiKey });
  return ai;
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        let  rawText ;
  try {
    ({  rawText  } = await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
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

        const response = await getAI().models.generateContent({
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

        try {
            const data = JSON.parse(response.text);
            return NextResponse.json({ success: true, data });
        } catch (parseError) {
            logger.error("AI Parse JSON Error:", parseError);
            return NextResponse.json({ success: false, error: "Failed to parse AI response" }, { status: 500 });
        }
    } catch (error) {
        logger.error("AI Parse Error:", error);
        return NextResponse.json({ success: false, error: "Failed to parse receipt" }, { status: 500 });
    }
}

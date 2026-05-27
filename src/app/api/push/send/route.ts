export const dynamic = "force-dynamic";

import { triggerSpendingAlert, triggerBillReminder } from "@/app/_actions/push";
import { safeEmail, safeString, safeNumber, safeDate, zodErrorResponse } from "@/lib/validate";
import { logger } from "@/lib/logger";
import { getAuthUser } from "@/lib/getAuthUser";

export async function POST() {
  const user = await getAuthUser();
  if (!user) {
    return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const spending = await triggerSpendingAlert();
    const bill = await triggerBillReminder();

    const messages = [];
    if (spending) messages.push(spending);
    if (bill) messages.push(bill);

    // In production, you'd push to a VAPID service here (e.g., web-push)
    // For now, return the messages so the client can display them
    return Response.json({ success: true, messages });
  } catch {
    return Response.json({ success: false, error: "Push send failed" }, { status: 500 });
  }
}

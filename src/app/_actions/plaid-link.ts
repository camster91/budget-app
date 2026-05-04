"use server";

import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { plaidClient } from "@/lib/plaid";
import { encrypt } from "@/lib/encryption";
import {
  CountryCode,
  Products,
} from "plaid";
import { revalidatePath } from "next/cache";

export async function createLinkToken() {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Unauthorized" };
  try {
    const tokenRes = await plaidClient.linkTokenCreate({
      user: { client_user_id: user.userId },
      client_name: "Budget App",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us, CountryCode.Ca],
      language: "en",
      redirect_uri: `${process.env.APP_URL}/api/plaid/oauth`,
    });

    return { success: true, data: { linkToken: tokenRes.data.link_token } };
  } catch (error) {
    console.error("Plaid link token error:", error);
    return { success: false, error: "Failed to create link token" };
  }
}

export async function exchangePublicToken(publicToken: string) {
  const user = await getAuthUser();
  if (!user) return { success: false, error: "Unauthorized" };
  try {
    const exchangeRes = await plaidClient.itemPublicTokenExchange({
      public_token: publicToken,
    });

    const accessToken = exchangeRes.data.access_token;
    const itemId = exchangeRes.data.item_id;

    await prisma.account.create({
      data: {
        name: "Linked Bank",
        type: "checking",
        institution: "Plaid Bank",
        plaidAccessToken: encrypt(accessToken),
        plaidItemId: itemId,
        householdId: user.householdId,
      },
    });

    revalidatePath("/accounts");
    return { success: true, data: { itemId } };
  } catch (error) {
    console.error("Plaid exchange error:", error);
    return { success: false, error: "Failed to link bank account" };
  }
}

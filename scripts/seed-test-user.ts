/**
 * Seed a test user for QA purposes.
 * Run with: npx tsx scripts/seed-test-user.ts
 *
 * Required env vars:
 *   TEST_USER_EMAIL    — email for the test account
 *   TEST_USER_PASSWORD — plain-text password (will be hashed)
 *
 * Optional:
 *   TEST_USER_NAME     — display name (default: "QA Test User")
 *   DATABASE_URL       — falls back to .env if not set via CLI
 */

import { config } from "dotenv";
import { resolve } from "path";
import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";

// Load .env before accessing env vars
config({ path: resolve(process.cwd(), ".env") });

async function seedTestUser() {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    const name = process.env.TEST_USER_NAME ?? "QA Test User";

    if (!email || !password) {
        console.error("❌ Missing required env vars:");
        if (!email) console.error("   TEST_USER_EMAIL");
        if (!password) console.error("   TEST_USER_PASSWORD");
        console.error("\nUsage:");
        console.error("   TEST_USER_EMAIL=qatest@example.com TEST_USER_PASSWORD=MyTestPass123 npx tsx scripts/seed-test-user.ts");
        process.exit(1);
    }

    console.log(`🌱 Seeding test user: ${email}`);

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log("⚠️  User already exists — updating password only.");
        const hashed = await hashPassword(password);
        await prisma.user.update({
            where: { email },
            data: { password: hashed, name },
        });
        console.log("✅ Password updated.");
    } else {
        // Create user without household (single-user app — household not needed for auth)
        const hashed = await hashPassword(password);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashed,
                name,
            },
        });
        console.log("✅ User created:", user.email);
    }

    console.log("\n✅ Test user seeded successfully!");
    console.log(`   Email:    ${email}`);
    console.log(`   Password:  ${password}`);
    console.log("\n👉 Open https://budget.ashbi.ca/login and sign in with the credentials above.\n");
}

seedTestUser().catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
});

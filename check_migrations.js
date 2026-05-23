import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check applied migrations
  const migrations = await prisma.$queryRawUnsafe(`
    SELECT id, migration_name, started_at, finished_at, rolled_back_at
    FROM _prisma_migrations
    ORDER BY started_at;
  `);
  
  console.log('=== APPLIED MIGRATIONS ===');
  for (const row of migrations) {
    console.log(JSON.stringify(row, null, 2));
  }
}

main().catch(e => {
  console.error('Error:', e.message);
  if (e.message.includes('relation \"_prisma_migrations\" does not exist')) {
    console.log('\nNo _prisma_migrations table found - DB might be fresh or never had migrations applied');
  }
}).finally(() => prisma.$disconnect());

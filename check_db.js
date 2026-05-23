import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Query information_schema to see actual DB columns
  const result = await prisma.$queryRawUnsafe(`
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    ORDER BY table_name, ordinal_position;
  `);
  
  console.log('=== ACTUAL DATABASE COLUMNS ===');
  const tables = {};
  for (const row of result) {
    if (!tables[row.table_name]) tables[row.table_name] = [];
    tables[row.table_name].push(row.column_name);
  }
  
  for (const [table, cols] of Object.entries(tables)) {
    console.log(`\n${table}:`);
    for (const col of cols) {
      console.log(`  - ${col}`);
    }
  }
}

main().catch(e => {
  console.error(e);
}).finally(() => prisma.$disconnect());

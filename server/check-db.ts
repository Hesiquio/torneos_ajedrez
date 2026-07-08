import * as dotenv from 'dotenv';
import { createClient } from '@libsql/client';
dotenv.config();

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

async function run() {
  const tables = await db.execute("SELECT name, sql FROM sqlite_master WHERE type='table'");
  for (const row of tables.rows) {
    console.log(`\n--- ${row.name} ---`);
    console.log(row.sql);
  }
}

run().catch(console.error);

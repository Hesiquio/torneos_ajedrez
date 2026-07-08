import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';
dotenv.config();

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

async function run() {
  const p = await db.execute('SELECT COUNT(*) as c FROM players');
  console.log('Players:', p.rows);
  const c = await db.execute('SELECT * FROM clubs');
  console.log('Clubs:', c.rows);
}
run();

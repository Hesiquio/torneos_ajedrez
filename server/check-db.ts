import * as dotenv from 'dotenv';
import { createClient } from '@libsql/client';
dotenv.config();

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

async function run() {
  const tid = '757c3e9e-00dc-476b-82b9-c2533dce04d3';
  const t = await db.execute({ sql: 'SELECT * FROM tournaments WHERE id=?', args: [tid] });
  console.log('Tournament:', JSON.stringify(t.rows, null, 2));

  const p = await db.execute({ sql: 'SELECT player_id FROM tournament_participants WHERE tournament_id=?', args: [tid] });
  console.log('Participants:', p.rows.length);
  
  const r = await db.execute({ sql: 'SELECT * FROM rounds WHERE tournament_id=? ORDER BY round_number', args: [tid] });
  console.log('Rounds:', r.rows);
}
run().catch(console.error);

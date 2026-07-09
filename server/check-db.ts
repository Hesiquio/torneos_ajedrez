import * as dotenv from 'dotenv';
import { createClient } from '@libsql/client';
dotenv.config();

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

const TID = '757c3e9e-00dc-476b-82b9-c2533dce04d3';

async function run() {
  const t = await db.execute({ sql: 'SELECT * FROM tournaments WHERE id=?', args: [TID] });
  console.log('Tournament:', JSON.stringify(t.rows[0]));

  const r = await db.execute({ sql: 'SELECT * FROM rounds WHERE tournament_id=? ORDER BY round_number', args: [TID] });
  console.log('Rounds:', r.rows.length, r.rows.map((x:any)=>({num:x.round_number,status:x.status})));

  const m = await db.execute({ 
    sql: `SELECT m.id, m.result, m.is_bye, r.round_number, w.name as white, b.name as black
          FROM matches m
          JOIN rounds r ON m.round_id = r.id
          JOIN players w ON m.white_player_id = w.id
          LEFT JOIN players b ON m.black_player_id = b.id
          WHERE m.tournament_id=? ORDER BY r.round_number, m.id`, 
    args: [TID] 
  });
  console.log('\nMatches:');
  for (const match of m.rows) {
    console.log(`  R${match.round_number}: ${match.white} vs ${match.black} => ${match.result}`);
  }
  console.log('\nTotal:', m.rows.length, '| With result:', m.rows.filter((x:any)=>x.result).length);
}
run().catch(console.error);

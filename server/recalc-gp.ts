import * as dotenv from 'dotenv';
import { createClient } from '@libsql/client';
dotenv.config();

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

const TID = '757c3e9e-00dc-476b-82b9-c2533dce04d3'; // retas08julio26
const GP_MAP = [10, 8, 6, 4, 2]; // puntos por posición (del 1ro al 5to, el resto recibe 1)

async function recalculate() {
  console.log('=== Recalculando GP para retas08julio26 ===\n');

  // 1. Get all matches for this tournament
  const mRes = await db.execute({
    sql: `SELECT m.white_player_id, m.black_player_id, m.result, m.is_bye
          FROM matches m WHERE m.tournament_id = ?`,
    args: [TID]
  });

  // 2. Get participants
  const pRes = await db.execute({
    sql: `SELECT p.id, p.name, p.grand_prix_points FROM players p
          JOIN tournament_participants tp ON p.id = tp.player_id
          WHERE tp.tournament_id = ?`,
    args: [TID]
  });
  const players = pRes.rows;

  // 3. Calculate correct standings (same logic as the fixed server endpoint)
  const pointsMap = new Map<string, number>();
  const opponentsMap = new Map<string, string[]>();

  for (const p of players) {
    pointsMap.set(p.id as string, 0);
    opponentsMap.set(p.id as string, []);
  }

  for (const m of mRes.rows) {
    if (!m.result || m.is_bye === 1) continue;
    const wid = m.white_player_id as string;
    const bid = m.black_player_id as string;
    if (m.result === '1-0') {
      pointsMap.set(wid, (pointsMap.get(wid) || 0) + 1);
    } else if (m.result === '0-1') {
      pointsMap.set(bid, (pointsMap.get(bid) || 0) + 1);
    } else if (m.result === '0.5-0.5') {
      pointsMap.set(wid, (pointsMap.get(wid) || 0) + 0.5);
      pointsMap.set(bid, (pointsMap.get(bid) || 0) + 0.5);
    }
    opponentsMap.get(wid)?.push(bid);
    opponentsMap.get(bid)?.push(wid);
  }

  const correctStandings = players.map((p: any) => {
    const pid = p.id as string;
    const pts = pointsMap.get(pid) || 0;
    const buchholz = (opponentsMap.get(pid) || [])
      .reduce((sum, oppId) => sum + (pointsMap.get(oppId) || 0), 0);
    return { id: pid, name: p.name, tournamentPoints: pts, buchholz };
  }).sort((a, b) => b.tournamentPoints - a.tournamentPoints || b.buchholz - a.buchholz);

  console.log('Clasificación correcta:');
  correctStandings.forEach((p, i) => {
    const gpEarned = i < GP_MAP.length ? GP_MAP[i] : 1;
    console.log(`  ${i+1}. ${p.name} — ${p.tournamentPoints} pts (Buchholz: ${p.buchholz}) → GP: +${gpEarned}`);
  });

  // 4. Estimate what GP was incorrectly awarded.
  // The old calculation used swiss-pairing which had round 4 missing,
  // so we assume the OLD order was by swiss-pairing without round 4.
  // Safest approach: subtract what was wrongly added, add what should have been.
  //
  // Since we don't know the exact old order, we'll:
  //   a) Subtract 1 GP from ALL participants (minimum that everyone got)
  //   b) Subtract the position bonus from each player in the old (wrong) order
  //   c) Add the correct GP amounts

  // Re-calculate old (wrong) standings — same formula but EXCLUDING round 4 matches
  const pointsMapOld = new Map<string, number>();
  const opponentsMapOld = new Map<string, string[]>();
  for (const p of players) {
    pointsMapOld.set(p.id as string, 0);
    opponentsMapOld.set(p.id as string, []);
  }
  const rounds1to3 = await db.execute({
    sql: `SELECT m.white_player_id, m.black_player_id, m.result, m.is_bye
          FROM matches m
          JOIN rounds r ON m.round_id = r.id
          WHERE m.tournament_id = ? AND r.round_number <= 3`,
    args: [TID]
  });
  for (const m of rounds1to3.rows) {
    if (!m.result || m.is_bye === 1) continue;
    const wid = m.white_player_id as string;
    const bid = m.black_player_id as string;
    if (m.result === '1-0') {
      pointsMapOld.set(wid, (pointsMapOld.get(wid) || 0) + 1);
    } else if (m.result === '0-1') {
      pointsMapOld.set(bid, (pointsMapOld.get(bid) || 0) + 1);
    } else if (m.result === '0.5-0.5') {
      pointsMapOld.set(wid, (pointsMapOld.get(wid) || 0) + 0.5);
      pointsMapOld.set(bid, (pointsMapOld.get(bid) || 0) + 0.5);
    }
    opponentsMapOld.get(wid)?.push(bid);
    opponentsMapOld.get(bid)?.push(wid);
  }
  const oldStandings = players.map((p: any) => {
    const pid = p.id as string;
    const pts = pointsMapOld.get(pid) || 0;
    const buchholz = (opponentsMapOld.get(pid) || [])
      .reduce((sum, oppId) => sum + (pointsMapOld.get(oppId) || 0), 0);
    return { id: pid, name: p.name, pts, buchholz };
  }).sort((a, b) => b.pts - a.pts || b.buchholz - a.buchholz);

  console.log('\nClasificación antigua (incorrecta, sin ronda 4):');
  oldStandings.forEach((p, i) => {
    const gpAwarded = i < GP_MAP.length ? GP_MAP[i] : 1;
    console.log(`  ${i+1}. ${p.name} — ${p.pts} pts → GP otorgado: +${gpAwarded}`);
  });

  // 5. Apply correction: subtract old GP, add correct GP
  console.log('\nAplicando corrección...');
  for (let i = 0; i < oldStandings.length; i++) {
    const wrongGP = i < GP_MAP.length ? GP_MAP[i] : 1;
    await db.execute({
      sql: 'UPDATE players SET grand_prix_points = grand_prix_points - ? WHERE id = ?',
      args: [wrongGP, oldStandings[i].id]
    });
  }

  for (let i = 0; i < correctStandings.length; i++) {
    const correctGP = i < GP_MAP.length ? GP_MAP[i] : 1;
    await db.execute({
      sql: 'UPDATE players SET grand_prix_points = grand_prix_points + ? WHERE id = ?',
      args: [correctGP, correctStandings[i].id]
    });
  }

  // 6. Show final GP totals
  const finalPlayers = await db.execute({
    sql: `SELECT p.name, p.grand_prix_points FROM players p
          JOIN tournament_participants tp ON p.id = tp.player_id
          WHERE tp.tournament_id = ? ORDER BY p.grand_prix_points DESC`,
    args: [TID]
  });
  console.log('\n✅ Puntos GP finales en la Liga:');
  for (const p of finalPlayers.rows) {
    console.log(`  ${p.name}: ${p.grand_prix_points} pts GP`);
  }

  db.close();
}

recalculate().catch(err => { console.error(err); process.exit(1); });

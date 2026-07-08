import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { createClient } from '@libsql/client';


dotenv.config();

const db = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN!,
});

const BACKUP_FILE = path.join(__dirname, '../respaldo/LIGA_GLOBAL_06_26-backup.json');
const CLUB_ID = 'e621e824-082f-48c5-8053-bfcbbd8c32fd'; // Los Guardianes del Rey

async function restore() {
  const raw = fs.readFileSync(BACKUP_FILE, 'utf8');
  const backup = JSON.parse(raw);

  const { tournament, players: backupPlayers, rounds, matches } = backup;

  console.log(`Restaurando torneo: "${tournament.name}"`);
  console.log(`  Jugadores en backup: ${backupPlayers.length}`);
  console.log(`  Rondas: ${rounds.length}`);
  console.log(`  Partidas: ${matches.length}`);

  // 1. Obtener jugadores actuales en Turso para hacer el mapeo de IDs
  const currentPlayersRes = await db.execute({
    sql: 'SELECT id, name FROM players WHERE club_id = ?',
    args: [CLUB_ID]
  });
  const currentPlayers = currentPlayersRes.rows;
  console.log(`\nJugadores actuales en la BD: ${currentPlayers.length}`);

  // Mapa: nombre_normalizado -> id_actual_en_turso
  const nameToCurrentId = new Map<string, string>();
  for (const cp of currentPlayers) {
    nameToCurrentId.set((cp.name as string).trim().toLowerCase(), cp.id as string);
  }

  // Mapa: id_del_backup -> id_actual_en_turso
  const backupIdToCurrentId = new Map<string, string>();
  let unmapped = 0;
  for (const bp of backupPlayers) {
    const key = (bp.name as string).trim().toLowerCase();
    const currentId = nameToCurrentId.get(key);
    if (currentId) {
      backupIdToCurrentId.set(bp.id as string, currentId);
      console.log(`  ✓ Mapeado: ${bp.name} -> ${currentId}`);
    } else {
      console.warn(`  ✗ No encontrado en BD actual: ${bp.name}`);
      unmapped++;
    }
  }

  if (unmapped > 0) {
    console.error(`\n${unmapped} jugadores no pudieron ser mapeados. Verifica la BD.`);
  }

  // 2. Verificar si el torneo ya existe
  const existingTournament = await db.execute({
    sql: 'SELECT id FROM tournaments WHERE id = ?',
    args: [tournament.id]
  });

  if (existingTournament.rows.length > 0) {
    console.log(`\nEl torneo con ID ${tournament.id} ya existe. Saliendo para no duplicar.`);
    db.close();
    return;
  }

  // 3. Insertar el torneo
  console.log('\nInsertando torneo...');
  await db.execute({
    sql: 'INSERT INTO tournaments (id, club_id, name, status, total_rounds, is_grand_prix, admin_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [
      tournament.id,
      CLUB_ID,
      tournament.name,
      'archived', // torneo histórico completado
      rounds.length,
      1, // es Grand Prix
      'respaldo_historico'
    ]
  });
  console.log('  ✓ Torneo insertado');

  // 4. Insertar tournament_participants (los jugadores que pudimos mapear)
  console.log('Insertando participantes del torneo...');
  for (const [, currentId] of backupIdToCurrentId) {
    await db.execute({
      sql: 'INSERT INTO tournament_participants (tournament_id, player_id) VALUES (?, ?)',
      args: [tournament.id, currentId]
    });
  }
  console.log(`  ✓ ${backupIdToCurrentId.size} participantes insertados`);

  // 5. Insertar rondas
  console.log('Insertando rondas...');
  let roundsInserted = 0;
  for (const r of rounds) {
    await db.execute({
      sql: 'INSERT INTO rounds (id, tournament_id, round_number, status) VALUES (?, ?, ?, ?)',
      args: [r.id, tournament.id, r.round_number, r.status]
    });
    roundsInserted++;
  }
  console.log(`  ✓ ${roundsInserted} rondas insertadas`);

  // 6. Insertar partidas (solo las que tienen ambos jugadores mapeados)
  console.log('Insertando partidas...');
  let matchesInserted = 0;
  let matchesSkipped = 0;
  for (const m of matches) {
    const whiteCurrentId = backupIdToCurrentId.get(m.white_player_id);
    const blackCurrentId = backupIdToCurrentId.get(m.black_player_id);

    if (!whiteCurrentId || !blackCurrentId) {
      matchesSkipped++;
      continue;
    }

    await db.execute({
      sql: 'INSERT INTO matches (id, tournament_id, round_id, white_player_id, black_player_id, result, is_bye) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [
        m.id,
        tournament.id,
        m.round_id,
        whiteCurrentId,
        blackCurrentId,
        m.result ?? null,
        0
      ]
    });
    matchesInserted++;
  }

  console.log(`  ✓ ${matchesInserted} partidas insertadas`);
  if (matchesSkipped > 0) {
    console.warn(`  ⚠ ${matchesSkipped} partidas omitidas (jugadores no encontrados en BD)`);
  }

  console.log('\n✅ Restauración completada con éxito!');
  db.close();
}

restore().catch(err => {
  console.error('Error durante la restauración:', err);
  process.exit(1);
});

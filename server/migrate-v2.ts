import { db } from './db';
import { randomUUID } from 'crypto';

async function migrate() {
  console.log('--- Iniciando Migración a Versión 2 (Grand Prix) ---');
  try {
    // 1. Obtener todos los torneos actuales
    const tRes = await db.execute('SELECT * FROM tournaments');
    const oldTournaments = tRes.rows;
    console.log(`Se encontraron ${oldTournaments.length} torneos.`);

    // 2. Obtener todos los jugadores
    const pRes = await db.execute('SELECT * FROM players');
    const oldPlayers = pRes.rows;

    // 3. Obtener todos los matches
    const mRes = await db.execute('SELECT * FROM matches');
    const oldMatches = mRes.rows;

    console.log(`Calculando puntos acumulados para los jugadores actuales...`);
    
    // Diccionario para agrupar jugadores por nombre (normalizado)
    const globalPlayersMap = new Map<string, { id: string, name: string, age: number | null, points: number }>();

    // Calcular puntos de cada jugador original
    const oldPlayerPoints = new Map<string, number>();
    for (const p of oldPlayers) {
      oldPlayerPoints.set(p.id as string, 0);
    }

    for (const m of oldMatches) {
      if (m.result === '1-0') {
        const current = oldPlayerPoints.get(m.white_player_id as string) || 0;
        oldPlayerPoints.set(m.white_player_id as string, current + 1);
      } else if (m.result === '0-1') {
        const current = oldPlayerPoints.get(m.black_player_id as string) || 0;
        oldPlayerPoints.set(m.black_player_id as string, current + 1);
      } else if (m.result === '0.5-0.5') {
        const cw = oldPlayerPoints.get(m.white_player_id as string) || 0;
        const cb = oldPlayerPoints.get(m.black_player_id as string) || 0;
        oldPlayerPoints.set(m.white_player_id as string, cw + 0.5);
        oldPlayerPoints.set(m.black_player_id as string, cb + 0.5);
      }
    }

    // Agrupar en globalPlayersMap por nombre
    for (const p of oldPlayers) {
      const name = (p.name as string).trim();
      const lowerName = name.toLowerCase();
      const points = oldPlayerPoints.get(p.id as string) || 0;

      if (!globalPlayersMap.has(lowerName)) {
        globalPlayersMap.set(lowerName, {
          id: randomUUID(),
          name: name,
          age: p.age as number | null,
          points: points
        });
      } else {
        // Sumar puntos si el jugador ya existía en otro torneo
        const existing = globalPlayersMap.get(lowerName)!;
        existing.points += points;
        if (!existing.age && p.age) {
          existing.age = p.age as number | null; // Guardar la edad si antes no la tenía
        }
      }
    }

    const globalPlayers = Array.from(globalPlayersMap.values());
    console.log(`Se consolidaron ${globalPlayers.length} jugadores globales únicos.`);

    // 4. Modificar el esquema de la base de datos
    console.log('Recreando tablas de la base de datos...');
    
    // Deshabilitar FK temporalmente
    await db.execute('PRAGMA foreign_keys = OFF;');

    // Respaldar tablas viejas
    await db.execute('ALTER TABLE players RENAME TO old_players;');
    await db.execute('ALTER TABLE tournaments RENAME TO old_tournaments;');
    await db.execute('ALTER TABLE rounds RENAME TO old_rounds;');
    await db.execute('ALTER TABLE matches RENAME TO old_matches;');

    // Crear tablas nuevas
    await db.execute(`
      CREATE TABLE tournaments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        total_rounds INTEGER NOT NULL DEFAULT 5,
        admin_key TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER,
        grand_prix_points REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE tournament_participants (
        tournament_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        PRIMARY KEY (tournament_id, player_id),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE rounds (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL,
        round_number INTEGER NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
      );
    `);

    await db.execute(`
      CREATE TABLE matches (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL,
        round_id TEXT NOT NULL,
        white_player_id TEXT NOT NULL,
        black_player_id TEXT NOT NULL,
        result TEXT,
        is_bye INTEGER DEFAULT 0,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
        FOREIGN KEY (white_player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY (black_player_id) REFERENCES players(id) ON DELETE CASCADE
      );
    `);

    // 5. Insertar jugadores globales con sus puntos
    console.log('Insertando jugadores en tabla global...');
    for (const gp of globalPlayers) {
      await db.execute({
        sql: 'INSERT INTO players (id, name, age, grand_prix_points) VALUES (?, ?, ?, ?)',
        args: [gp.id, gp.name, gp.age, gp.points]
      });
    }

    // 6. Eliminar tablas viejas
    await db.execute('DROP TABLE old_matches;');
    await db.execute('DROP TABLE old_rounds;');
    await db.execute('DROP TABLE old_players;');
    await db.execute('DROP TABLE old_tournaments;');

    await db.execute('PRAGMA foreign_keys = ON;');

    console.log('Migración completada con éxito.');
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    db.close();
  }
}

migrate();

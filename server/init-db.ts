import { db } from './db';

async function init() {
  console.log('Initializing database tables...');
  try {
    // Enable foreign keys
    await db.execute('PRAGMA foreign_keys = ON;');

    // Clean drop for re-initialization
    await db.execute('DROP TABLE IF EXISTS matches;');
    await db.execute('DROP TABLE IF EXISTS rounds;');
    await db.execute('DROP TABLE IF EXISTS players;');
    await db.execute('DROP TABLE IF EXISTS tournaments;');

    // Tournaments table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'single' (una vuelta) o 'double' (doble vuelta)
        status TEXT NOT NULL, -- 'created', 'in_progress', 'completed'
        admin_key TEXT NOT NULL, -- password to edit
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Players table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL,
        name TEXT NOT NULL,
        age INTEGER, -- Edad del jugador
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
      );
    `);

    // Rounds table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL,
        round_number INTEGER NOT NULL,
        status TEXT NOT NULL, -- 'pending', 'completed'
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
      );
    `);

    // Matches table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL,
        round_id TEXT NOT NULL,
        white_player_id TEXT NOT NULL,
        black_player_id TEXT NOT NULL,
        result TEXT, -- '1-0', '0-1', '0.5-0.5', NULL (pendiente)
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
        FOREIGN KEY (white_player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY (black_player_id) REFERENCES players(id) ON DELETE CASCADE
      );
    `);

    console.log('Database tables initialized successfully!');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

init();

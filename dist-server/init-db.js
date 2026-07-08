"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
async function init() {
    console.log('Initializing database tables...');
    try {
        // Enable foreign keys
        await db_1.db.execute('PRAGMA foreign_keys = ON;');
        // Clean drop for re-initialization
        await db_1.db.execute('DROP TABLE IF EXISTS matches;');
        await db_1.db.execute('DROP TABLE IF EXISTS rounds;');
        await db_1.db.execute('DROP TABLE IF EXISTS tournament_participants;');
        await db_1.db.execute('DROP TABLE IF EXISTS players;');
        await db_1.db.execute('DROP TABLE IF EXISTS tournaments;');
        // Tournaments table
        await db_1.db.execute(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        status TEXT NOT NULL, -- 'created', 'in_progress', 'completed', 'archived'
        total_rounds INTEGER NOT NULL DEFAULT 5, -- number of swiss rounds
        admin_key TEXT NOT NULL, -- password to edit
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // Global Players table
        await db_1.db.execute(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER, -- Edad del jugador
        grand_prix_points REAL DEFAULT 0, -- Puntos totales de la liga
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);
        // Tournament Participants table (Many-to-Many)
        await db_1.db.execute(`
      CREATE TABLE IF NOT EXISTS tournament_participants (
        tournament_id TEXT NOT NULL,
        player_id TEXT NOT NULL,
        PRIMARY KEY (tournament_id, player_id),
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
      );
    `);
        // Rounds table
        await db_1.db.execute(`
      CREATE TABLE IF NOT EXISTS rounds (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL,
        round_number INTEGER NOT NULL,
        status TEXT NOT NULL, -- 'pending', 'completed'
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
      );
    `);
        // Matches table
        await db_1.db.execute(`
      CREATE TABLE IF NOT EXISTS matches (
        id TEXT PRIMARY KEY,
        tournament_id TEXT NOT NULL,
        round_id TEXT NOT NULL,
        white_player_id TEXT NOT NULL,
        black_player_id TEXT NOT NULL,
        result TEXT, -- '1-0', '0-1', '0.5-0.5', NULL (pendiente)
        is_bye INTEGER DEFAULT 0,
        FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
        FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
        FOREIGN KEY (white_player_id) REFERENCES players(id) ON DELETE CASCADE,
        FOREIGN KEY (black_player_id) REFERENCES players(id) ON DELETE CASCADE
      );
    `);
        console.log('Database tables initialized successfully!');
    }
    catch (error) {
        console.error('Error initializing database:', error);
        process.exit(1);
    }
    finally {
        db_1.db.close();
    }
}
init();

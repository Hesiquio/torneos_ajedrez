"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const client_1 = require("@libsql/client");
dotenv.config();
const db = (0, client_1.createClient)({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
});
async function fix() {
    console.log('Desactivando foreign keys...');
    await db.execute('PRAGMA foreign_keys = OFF');
    // Recrear tournament_participants con FK correctas
    console.log('Recreando tournament_participants...');
    await db.execute('DROP TABLE IF EXISTS tournament_participants');
    await db.execute(`
    CREATE TABLE tournament_participants (
      tournament_id TEXT NOT NULL,
      player_id TEXT NOT NULL,
      PRIMARY KEY (tournament_id, player_id),
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    )
  `);
    console.log('  ✓ tournament_participants recreada');
    // Recrear rounds con FK correctas
    console.log('Recreando rounds...');
    await db.execute('DROP TABLE IF EXISTS rounds');
    await db.execute(`
    CREATE TABLE rounds (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      round_number INTEGER NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
    )
  `);
    console.log('  ✓ rounds recreada');
    // Recrear matches con FK correctas
    console.log('Recreando matches...');
    await db.execute('DROP TABLE IF EXISTS matches');
    await db.execute(`
    CREATE TABLE matches (
      id TEXT PRIMARY KEY,
      tournament_id TEXT NOT NULL,
      round_id TEXT NOT NULL,
      white_player_id TEXT NOT NULL,
      black_player_id TEXT,
      result TEXT,
      is_bye INTEGER DEFAULT 0,
      FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
      FOREIGN KEY (round_id) REFERENCES rounds(id) ON DELETE CASCADE,
      FOREIGN KEY (white_player_id) REFERENCES players(id) ON DELETE CASCADE,
      FOREIGN KEY (black_player_id) REFERENCES players(id) ON DELETE CASCADE
    )
  `);
    console.log('  ✓ matches recreada');
    // Limpiar tournaments_old
    await db.execute('DROP TABLE IF EXISTS tournaments_old');
    console.log('  ✓ tournaments_old eliminada');
    await db.execute('PRAGMA foreign_keys = ON');
    console.log('\n✅ Esquema corregido.');
    db.close();
}
fix().catch(err => { console.error(err); process.exit(1); });

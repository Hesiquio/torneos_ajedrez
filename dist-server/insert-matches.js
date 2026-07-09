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
const crypto_1 = require("crypto");
dotenv.config();
const db = (0, client_1.createClient)({
    url: process.env.DATABASE_URL,
    authToken: process.env.DATABASE_AUTH_TOKEN,
});
const CLUB_ID = 'e621e824-082f-48c5-8053-bfcbbd8c32fd'; // Los Guardianes del Rey
const TOURNAMENT_ID = '757c3e9e-00dc-476b-82b9-c2533dce04d3'; // retas08julio26
// All players referenced in the matches (key = alias used below)
const ALIASES = {
    'said': ['said'],
    'aaron': ['aaron armando cel', 'aaron'],
    'hesiquio': ['hesiquio zarate', 'hesiquio'],
    'manuel': ['manuel escobar', 'manuel'],
    'leonardo': ['leonardo'],
    'santiago': ['jose santiago benitez', 'santiago'],
    'emiliano': ['emiliano posada', 'emiliano'],
    'daniel': ['daniel'],
    'melany': ['melany'],
    'jhonny': ['jhonny'],
    'juan': ['juan'],
    'hector': ['hector'],
};
const MATCHES = [
    // Jornada 1
    { round: 1, white: 'said', black: 'aaron', result: '0-1' },
    { round: 1, white: 'hesiquio', black: 'manuel', result: '1-0' },
    { round: 1, white: 'leonardo', black: 'santiago', result: '1-0' },
    { round: 1, white: 'emiliano', black: 'daniel', result: '0-1' },
    { round: 1, white: 'melany', black: 'jhonny', result: '0-1' },
    { round: 1, white: 'juan', black: 'hector', result: '0-1' },
    // Jornada 2
    { round: 2, white: 'aaron', black: 'leonardo', result: '0-1' },
    { round: 2, white: 'jhonny', black: 'daniel', result: '1-0' },
    { round: 2, white: 'hector', black: 'hesiquio', result: '1-0' },
    { round: 2, white: 'santiago', black: 'emiliano', result: '1-0' },
    { round: 2, white: 'juan', black: 'melany', result: '1-0' },
    { round: 2, white: 'manuel', black: 'said', result: '0-1' },
    // Jornada 3
    { round: 3, white: 'jhonny', black: 'leonardo', result: '1-0' },
    { round: 3, white: 'aaron', black: 'hector', result: '0-1' },
    { round: 3, white: 'daniel', black: 'santiago', result: '0-1' },
    { round: 3, white: 'said', black: 'juan', result: '0-1' },
    { round: 3, white: 'emiliano', black: 'hesiquio', result: '0-1' },
    { round: 3, white: 'manuel', black: 'melany', result: '0-1' },
    // Jornada 4
    { round: 4, white: 'jhonny', black: 'hector', result: '1-0' },
    { round: 4, white: 'santiago', black: 'juan', result: '1-0' },
    { round: 4, white: 'leonardo', black: 'hesiquio', result: '0-1' },
    { round: 4, white: 'daniel', black: 'aaron', result: '1-0' },
    { round: 4, white: 'melany', black: 'said', result: '1-0' },
    { round: 4, white: 'emiliano', black: 'manuel', result: '1-0' },
];
async function run() {
    // 1. Get existing players
    const existing = await db.execute({
        sql: 'SELECT id, name FROM players WHERE club_id = ?',
        args: [CLUB_ID]
    });
    // Build alias → player_id map
    const aliasToId = new Map();
    for (const p of existing.rows) {
        const nameLower = p.name.toLowerCase();
        aliasToId.set(nameLower, p.id);
        // Try matching partial names
        const parts = nameLower.split(' ');
        for (const part of parts) {
            if (part.length > 3 && !aliasToId.has(part)) {
                aliasToId.set(part, p.id);
            }
        }
    }
    // Resolve each alias key
    const keyToId = new Map();
    for (const [key, possibleNames] of Object.entries(ALIASES)) {
        for (const n of possibleNames) {
            if (aliasToId.has(n)) {
                keyToId.set(key, aliasToId.get(n));
                break;
            }
        }
        if (!keyToId.has(key)) {
            // Player doesn't exist yet — create them
            const newId = (0, crypto_1.randomUUID)();
            await db.execute({
                sql: 'INSERT INTO players (id, club_id, name, grand_prix_points) VALUES (?, ?, ?, 0)',
                args: [newId, CLUB_ID, key.charAt(0).toUpperCase() + key.slice(1)]
            });
            keyToId.set(key, newId);
            console.log(`  ✚ Creado nuevo jugador: ${key} → ${newId}`);
        }
    }
    console.log('\nJugadores resueltos:');
    for (const [k, v] of keyToId)
        console.log(`  ${k} → ${v}`);
    // 2. Clean the tournament (reset to fresh state)
    console.log('\nLimpiando el torneo anterior...');
    await db.execute({ sql: 'DELETE FROM matches WHERE tournament_id = ?', args: [TOURNAMENT_ID] });
    await db.execute({ sql: 'DELETE FROM rounds WHERE tournament_id = ?', args: [TOURNAMENT_ID] });
    await db.execute({ sql: 'DELETE FROM tournament_participants WHERE tournament_id = ?', args: [TOURNAMENT_ID] });
    // 3. Insert participants
    console.log('Inscribiendo participantes...');
    for (const id of keyToId.values()) {
        await db.execute({
            sql: 'INSERT OR IGNORE INTO tournament_participants (tournament_id, player_id) VALUES (?, ?)',
            args: [TOURNAMENT_ID, id]
        });
    }
    // 4. Create 4 rounds
    console.log('Creando 4 rondas...');
    const roundIds = {};
    for (let r = 1; r <= 4; r++) {
        const rid = (0, crypto_1.randomUUID)();
        roundIds[r] = rid;
        await db.execute({
            sql: 'INSERT INTO rounds (id, tournament_id, round_number, status) VALUES (?, ?, ?, ?)',
            args: [rid, TOURNAMENT_ID, r, 'completed']
        });
    }
    // 5. Update tournament to in_progress with 4 rounds
    await db.execute({
        sql: 'UPDATE tournaments SET status = ?, total_rounds = ? WHERE id = ?',
        args: ['in_progress', 4, TOURNAMENT_ID]
    });
    // 6. Insert matches
    console.log('Insertando partidas...');
    let inserted = 0;
    for (const m of MATCHES) {
        const wid = keyToId.get(m.white);
        const bid = keyToId.get(m.black);
        if (!wid || !bid) {
            console.error(`  ✗ No se encontró jugador: ${m.white} o ${m.black}`);
            continue;
        }
        await db.execute({
            sql: 'INSERT INTO matches (id, tournament_id, round_id, white_player_id, black_player_id, result, is_bye) VALUES (?, ?, ?, ?, ?, ?, 0)',
            args: [(0, crypto_1.randomUUID)(), TOURNAMENT_ID, roundIds[m.round], wid, bid, m.result]
        });
        inserted++;
    }
    console.log(`\n✅ ${inserted}/24 partidas insertadas en 4 rondas.`);
    console.log('Torneo actualizado a "in_progress".');
    db.close();
}
run().catch(err => { console.error(err); process.exit(1); });

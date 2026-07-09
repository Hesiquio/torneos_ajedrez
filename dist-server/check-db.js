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
const TID = '757c3e9e-00dc-476b-82b9-c2533dce04d3';
async function run() {
    const t = await db.execute({ sql: 'SELECT * FROM tournaments WHERE id=?', args: [TID] });
    console.log('Tournament:', JSON.stringify(t.rows[0]));
    const r = await db.execute({ sql: 'SELECT * FROM rounds WHERE tournament_id=? ORDER BY round_number', args: [TID] });
    console.log('Rounds:', r.rows.length, r.rows.map((x) => ({ num: x.round_number, status: x.status })));
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
    console.log('\nTotal:', m.rows.length, '| With result:', m.rows.filter((x) => x.result).length);
}
run().catch(console.error);

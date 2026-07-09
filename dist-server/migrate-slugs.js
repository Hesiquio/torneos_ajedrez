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
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD') // remove accents
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-') // replace spaces with -
        .replace(/[^\w\-]+/g, '') // remove all non-word chars
        .replace(/\-\-+/g, '-') // replace multiple - with single -
        .replace(/^-+/, '') // trim - from start of text
        .replace(/-+$/, ''); // trim - from end of text
}
async function run() {
    console.log('--- Iniciando Migración de Slugs ---');
    // 1. Agregar columna slug a clubs si no existe
    try {
        await db.execute('ALTER TABLE clubs ADD COLUMN slug TEXT');
        console.log('✅ Columna "slug" añadida a la tabla "clubs".');
    }
    catch (err) {
        console.log('ℹ️ La columna "slug" ya existía o no se pudo agregar a "clubs".');
    }
    // 2. Agregar columna slug a tournaments si no existe
    try {
        await db.execute('ALTER TABLE tournaments ADD COLUMN slug TEXT');
        console.log('✅ Columna "slug" añadida a la tabla "tournaments".');
    }
    catch (err) {
        console.log('ℹ️ La columna "slug" ya existía o no se pudo agregar a "tournaments".');
    }
    // 3. Rellenar slugs para clubs
    const clubs = await db.execute('SELECT id, name FROM clubs');
    console.log(`\nProcesando ${clubs.rows.length} clubes...`);
    for (const c of clubs.rows) {
        let slug = slugify(c.name);
        if (!slug)
            slug = 'club-' + c.id.substring(0, 8);
        // Verificar si ya existe este slug para evitar duplicados
        let isUnique = false;
        let attempt = 0;
        let testSlug = slug;
        while (!isUnique) {
            const check = await db.execute({
                sql: 'SELECT id FROM clubs WHERE slug = ? AND id != ?',
                args: [testSlug, c.id]
            });
            if (check.rows.length === 0) {
                isUnique = true;
                slug = testSlug;
            }
            else {
                attempt++;
                testSlug = `${slug}-${attempt}`;
            }
        }
        await db.execute({
            sql: 'UPDATE clubs SET slug = ? WHERE id = ?',
            args: [slug, c.id]
        });
        console.log(`  Club: "${c.name}" ➔ "${slug}"`);
    }
    // 4. Rellenar slugs para torneos
    const tournaments = await db.execute('SELECT id, name FROM tournaments');
    console.log(`\nProcesando ${tournaments.rows.length} torneos...`);
    for (const t of tournaments.rows) {
        let slug = slugify(t.name);
        if (!slug)
            slug = 'torneo-' + t.id.substring(0, 8);
        let isUnique = false;
        let attempt = 0;
        let testSlug = slug;
        while (!isUnique) {
            const check = await db.execute({
                sql: 'SELECT id FROM tournaments WHERE slug = ? AND id != ?',
                args: [testSlug, t.id]
            });
            if (check.rows.length === 0) {
                isUnique = true;
                slug = testSlug;
            }
            else {
                attempt++;
                testSlug = `${slug}-${attempt}`;
            }
        }
        await db.execute({
            sql: 'UPDATE tournaments SET slug = ? WHERE id = ?',
            args: [slug, t.id]
        });
        console.log(`  Torneo: "${t.name}" ➔ "${slug}"`);
    }
    // 5. Aplicar índice único a los slugs para asegurar integridad en el futuro
    try {
        await db.execute('CREATE UNIQUE INDEX idx_clubs_slug ON clubs(slug)');
        console.log('\n✅ Creado índice único para slugs de clubes.');
    }
    catch (e) {
        console.log('ℹ️ El índice único de slugs para clubes ya existía.');
    }
    try {
        await db.execute('CREATE UNIQUE INDEX idx_tournaments_slug ON tournaments(slug)');
        console.log('✅ Creado índice único para slugs de torneos.');
    }
    catch (e) {
        console.log('ℹ️ El índice único de slugs para torneos ya existía.');
    }
    console.log('\n🏁 ¡Migración finalizada con éxito!');
    db.close();
}
run().catch(console.error);

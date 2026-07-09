"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("./db");
const swiss_1 = require("./swiss");
function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-chess-key';
if (process.env.NODE_ENV === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, '../dist')));
}
// ================= AUTHENTICATION & MIDDLEWARE =================
app.post('/api/admin/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password)
        return res.status(400).json({ error: 'Faltan credenciales' });
    try {
        const result = await db_1.db.execute({
            sql: 'SELECT id, username, password_hash, role, club_id FROM users WHERE username = ?',
            args: [username]
        });
        if (result.rows.length === 0)
            return res.status(401).json({ error: 'Credenciales inválidas' });
        const user = result.rows[0];
        const isValid = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!isValid)
            return res.status(401).json({ error: 'Credenciales inválidas' });
        const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role, clubId: user.club_id }, JWT_SECRET, { expiresIn: '12h' });
        res.json({ token, user: { id: user.id, username: user.username, role: user.role, clubId: user.club_id } });
    }
    catch (e) {
        res.status(500).json({ error: 'Database error' });
    }
});
function verifyGlobalAdmin(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token)
        return res.status(401).json({ error: 'No autorizado' });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (e) {
        res.status(401).json({ error: 'Token inválido' });
    }
}
async function verifyTournamentAdminKey(tournamentId, req) {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            if (decoded.role === 'SUPER_ADMIN')
                return true;
            if (decoded.role === 'CLUB_ADMIN') {
                const tResult = await db_1.db.execute({ sql: 'SELECT club_id FROM tournaments WHERE id = ?', args: [tournamentId] });
                if (tResult.rows.length > 0 && tResult.rows[0].club_id === decoded.clubId)
                    return true;
            }
        }
        catch (e) { }
    }
    const providedKey = req.headers['x-admin-key'] || req.body.adminKey;
    if (!providedKey)
        return false;
    try {
        const result = await db_1.db.execute({ sql: 'SELECT admin_key FROM tournaments WHERE id = ?', args: [tournamentId] });
        if (result.rows.length === 0)
            return false;
        return result.rows[0].admin_key === providedKey;
    }
    catch (e) {
        return false;
    }
}
app.post('/api/tournaments/:id/verify-admin', async (req, res) => {
    const { id } = req.params;
    const isValid = await verifyTournamentAdminKey(id, req);
    if (!isValid)
        return res.status(403).json({ error: 'Clave incorrecta.' });
    res.json({ ok: true });
});
// --- Clubs API ---
app.get('/api/clubs', async (req, res) => {
    try {
        const rs = await db_1.db.execute('SELECT * FROM clubs ORDER BY created_at DESC');
        res.json(rs.rows);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/admin/clubs', verifyGlobalAdmin, async (req, res) => {
    try {
        const rs = await db_1.db.execute('SELECT * FROM clubs ORDER BY created_at DESC');
        res.json(rs.rows);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.post('/api/clubs', verifyGlobalAdmin, async (req, res) => {
    try {
        const { name } = req.body;
        if (!name)
            return res.status(400).json({ error: 'Name is required' });
        const id = (0, crypto_1.randomUUID)();
        // Generate unique slug
        let baseSlug = slugify(name);
        let slug = baseSlug || 'club-' + id.substring(0, 8);
        let isUnique = false;
        let attempt = 0;
        while (!isUnique) {
            const check = await db_1.db.execute({
                sql: 'SELECT id FROM clubs WHERE slug = ?',
                args: [slug]
            });
            if (check.rows.length === 0) {
                isUnique = true;
            }
            else {
                attempt++;
                slug = `${baseSlug}-${attempt}`;
            }
        }
        await db_1.db.execute({
            sql: 'INSERT INTO clubs (id, name, slug) VALUES (?, ?, ?)',
            args: [id, name, slug]
        });
        res.json({ success: true, id, slug });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.put('/api/clubs/:id', verifyGlobalAdmin, async (req, res) => {
    try {
        const { name, description } = req.body;
        // Also regenerate slug on update to match new name
        let baseSlug = slugify(name);
        let slug = baseSlug || 'club-' + req.params.id.substring(0, 8);
        let isUnique = false;
        let attempt = 0;
        while (!isUnique) {
            const check = await db_1.db.execute({
                sql: 'SELECT id FROM clubs WHERE slug = ? AND id != ?',
                args: [slug, req.params.id]
            });
            if (check.rows.length === 0) {
                isUnique = true;
            }
            else {
                attempt++;
                slug = `${baseSlug}-${attempt}`;
            }
        }
        await db_1.db.execute({
            sql: 'UPDATE clubs SET name = ?, slug = ?, description = ? WHERE id = ?',
            args: [name, slug, description || null, req.params.id]
        });
        res.json({ success: true, slug });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.delete('/api/clubs/:id', verifyGlobalAdmin, async (req, res) => {
    try {
        // Delete players (this also avoids orphan players)
        await db_1.db.execute({
            sql: 'DELETE FROM players WHERE club_id = ?',
            args: [req.params.id]
        });
        // Delete tournaments (which will theoretically leave orphan matches/rounds, so we delete those too)
        const tRes = await db_1.db.execute({
            sql: 'SELECT id FROM tournaments WHERE club_id = ?',
            args: [req.params.id]
        });
        for (const row of tRes.rows) {
            await db_1.db.execute({ sql: 'DELETE FROM matches WHERE tournament_id = ?', args: [row.id] });
            await db_1.db.execute({ sql: 'DELETE FROM rounds WHERE tournament_id = ?', args: [row.id] });
            await db_1.db.execute({ sql: 'DELETE FROM tournament_players WHERE tournament_id = ?', args: [row.id] });
            await db_1.db.execute({ sql: 'DELETE FROM standings WHERE tournament_id = ?', args: [row.id] });
        }
        await db_1.db.execute({
            sql: 'DELETE FROM tournaments WHERE club_id = ?',
            args: [req.params.id]
        });
        // Delete the club itself
        await db_1.db.execute({
            sql: 'DELETE FROM clubs WHERE id = ?',
            args: [req.params.id]
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
app.get('/api/clubs/:idOrSlug/history', async (req, res) => {
    const { idOrSlug } = req.params;
    const page = parseInt(req.query.page) || 0; // index of the tournament (0 = most recent)
    try {
        // Resolve actual club ID
        const clubRes = await db_1.db.execute({
            sql: 'SELECT id FROM clubs WHERE id = ? OR slug = ?',
            args: [idOrSlug, idOrSlug]
        });
        const actualClubId = clubRes.rows.length > 0 ? String(clubRes.rows[0].id) : idOrSlug;
        // Get list of tournaments for this club (completed or archived)
        const tRes = await db_1.db.execute({
            sql: "SELECT id, name, created_at FROM tournaments WHERE club_id = ? AND status IN ('completed', 'archived') ORDER BY created_at DESC",
            args: [actualClubId]
        });
        const totalTournaments = tRes.rows.length;
        if (totalTournaments === 0 || page >= totalTournaments || page < 0) {
            return res.json({ matches: [], totalTournaments, currentPage: page });
        }
        const selectedTournament = tRes.rows[page];
        // Fetch matches only for the selected tournament
        const rs = await db_1.db.execute({
            sql: `SELECT m.id, m.result, m.is_bye,
            t.name as tournament_name, t.created_at as tournament_date,
            r.round_number,
            w.name as white_player_name, b.name as black_player_name
            FROM matches m
            JOIN tournaments t ON m.tournament_id = t.id
            JOIN rounds r ON m.round_id = r.id
            JOIN players w ON m.white_player_id = w.id
            LEFT JOIN players b ON m.black_player_id = b.id
            WHERE t.id = ? AND m.result IS NOT NULL AND m.is_bye = 0
            ORDER BY r.round_number ASC, m.id ASC`,
            args: [selectedTournament.id]
        });
        res.json({
            matches: rs.rows,
            totalTournaments,
            currentPage: page,
            tournamentName: selectedTournament.name,
            tournamentDate: selectedTournament.created_at
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
// ================= PLAYERS =================
app.get('/api/players', async (req, res) => {
    try {
        const clubIdOrSlug = req.query.club_id;
        // include_hidden=true is only used by admin endpoints
        const includeHidden = req.query.include_hidden === 'true';
        const hiddenFilter = includeHidden ? '' : 'AND (hidden IS NULL OR hidden = 0)';
        let sql = `SELECT * FROM players WHERE club_id IS NULL ${hiddenFilter} ORDER BY grand_prix_points DESC, name ASC`;
        let args = [];
        if (clubIdOrSlug && clubIdOrSlug !== 'null') {
            // Find club ID first by id or slug
            const slugStr = String(clubIdOrSlug);
            const clubRes = await db_1.db.execute({
                sql: 'SELECT id FROM clubs WHERE id = ? OR slug = ?',
                args: [slugStr, slugStr]
            });
            if (clubRes.rows.length > 0) {
                const actualClubId = String(clubRes.rows[0].id);
                sql = `SELECT * FROM players WHERE club_id = ? ${hiddenFilter} ORDER BY grand_prix_points DESC, name ASC`;
                args = [actualClubId];
            }
            else {
                // Fallback to query with clubIdOrSlug directly
                sql = `SELECT * FROM players WHERE club_id = ? ${hiddenFilter} ORDER BY grand_prix_points DESC, name ASC`;
                args = [clubIdOrSlug];
            }
        }
        const result = await db_1.db.execute({ sql, args });
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
// GET single player detail
app.get('/api/players/:id/profile', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db_1.db.execute({
            sql: 'SELECT * FROM players WHERE id = ?',
            args: [id]
        });
        if (result.rows.length === 0)
            return res.status(404).json({ error: 'Player not found' });
        res.json(result.rows[0]);
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
// GET single player matches history (paginated)
app.get('/api/players/:id/history', async (req, res) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 5;
    const offset = parseInt(req.query.offset) || 0;
    try {
        // Get total matches count for this player
        const countRes = await db_1.db.execute({
            sql: `SELECT COUNT(*) as total FROM matches 
            WHERE (white_player_id = ? OR black_player_id = ?) AND result IS NOT NULL`,
            args: [id, id]
        });
        const totalMatches = Number(countRes.rows[0].total || 0);
        const result = await db_1.db.execute({
            sql: `SELECT m.id, m.result, m.is_bye, m.white_player_id, m.black_player_id,
            t.name as tournament_name, t.created_at as tournament_date,
            r.round_number,
            w.name as white_player_name, b.name as black_player_name
            FROM matches m
            JOIN tournaments t ON m.tournament_id = t.id
            JOIN rounds r ON m.round_id = r.id
            JOIN players w ON m.white_player_id = w.id
            LEFT JOIN players b ON m.black_player_id = b.id
            WHERE (m.white_player_id = ? OR m.black_player_id = ?) AND m.result IS NOT NULL
            ORDER BY t.created_at DESC, r.round_number DESC, m.id DESC
            LIMIT ? OFFSET ?`,
            args: [id, id, limit, offset]
        });
        res.json({ matches: result.rows, totalMatches, limit, offset });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
app.post('/api/players', async (req, res) => {
    const { name, age, clubId } = req.body;
    if (!name || name.trim() === '')
        return res.status(400).json({ error: 'Player name is required' });
    try {
        const id = (0, crypto_1.randomUUID)();
        const formattedName = name.trim().toUpperCase();
        await db_1.db.execute({
            sql: 'INSERT INTO players (id, club_id, name, age) VALUES (?, ?, ?, ?)',
            args: [id, clubId || null, formattedName, age ? parseInt(age) : null]
        });
        res.json({ id, club_id: clubId || null, name: formattedName, age, grand_prix_points: 0 });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
app.put('/api/players/:id', verifyGlobalAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, age, grand_prix_points, grandPrixPoints } = req.body;
    if (!name || name.trim() === '')
        return res.status(400).json({ error: 'Player name is required' });
    try {
        const pResult = await db_1.db.execute({ sql: 'SELECT club_id FROM players WHERE id = ?', args: [id] });
        if (pResult.rows.length === 0)
            return res.status(404).json({ error: 'Player not found' });
        const user = req.user;
        if (user.role === 'CLUB_ADMIN' && pResult.rows[0].club_id !== user.clubId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const finalGP = grand_prix_points !== undefined ? grand_prix_points : grandPrixPoints;
        await db_1.db.execute({
            sql: 'UPDATE players SET name = ?, age = ?, grand_prix_points = ? WHERE id = ?',
            args: [name.trim().toUpperCase(), age ? parseInt(age) : null, finalGP !== undefined ? parseFloat(finalGP) : 0, id]
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
// Toggle player visibility (admin only)
app.patch('/api/players/:id/visibility', verifyGlobalAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const pResult = await db_1.db.execute({ sql: 'SELECT club_id, hidden FROM players WHERE id = ?', args: [id] });
        if (pResult.rows.length === 0)
            return res.status(404).json({ error: 'Player not found' });
        const user = req.user;
        if (user.role === 'CLUB_ADMIN' && pResult.rows[0].club_id !== user.clubId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        const currentlyHidden = pResult.rows[0].hidden === 1;
        await db_1.db.execute({
            sql: 'UPDATE players SET hidden = ? WHERE id = ?',
            args: [currentlyHidden ? 0 : 1, id]
        });
        res.json({ hidden: !currentlyHidden });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
app.delete('/api/players/:id', verifyGlobalAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const pResult = await db_1.db.execute({ sql: 'SELECT club_id FROM players WHERE id = ?', args: [id] });
        if (pResult.rows.length === 0)
            return res.status(404).json({ error: 'Player not found' });
        const user = req.user;
        if (user.role === 'CLUB_ADMIN' && pResult.rows[0].club_id !== user.clubId) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        await db_1.db.execute({ sql: 'DELETE FROM players WHERE id = ?', args: [id] });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
// ================= TOURNAMENTS =================
app.get('/api/tournaments', async (req, res) => {
    try {
        const clubId = req.query.club_id;
        const clubIdOrSlug = req.query.club_id;
        const showArchived = req.query.archived === 'true';
        let sql = '';
        let args = [];
        if (clubIdOrSlug && clubIdOrSlug !== 'null') {
            // Find actual club ID first
            const slugStr = String(clubIdOrSlug);
            const clubRes = await db_1.db.execute({
                sql: 'SELECT id FROM clubs WHERE id = ? OR slug = ?',
                args: [slugStr, slugStr]
            });
            const actualClubId = clubRes.rows.length > 0 ? String(clubRes.rows[0].id) : slugStr;
            sql = showArchived
                ? "SELECT id, name, slug, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE club_id = ? AND status = 'archived' ORDER BY created_at DESC"
                : "SELECT id, name, slug, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE club_id = ? AND status != 'archived' ORDER BY created_at DESC";
            args = [actualClubId];
        }
        else {
            sql = showArchived
                ? "SELECT id, name, slug, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE club_id IS NULL AND status = 'archived' ORDER BY created_at DESC"
                : "SELECT id, name, slug, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE club_id IS NULL AND status != 'archived' ORDER BY created_at DESC";
        }
        const result = await db_1.db.execute({ sql, args });
        res.json(result.rows);
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
app.post('/api/tournaments', async (req, res) => {
    const { name, totalRounds, adminKey, clubId, isGrandPrix } = req.body;
    if (!name || !adminKey || adminKey.trim() === '') {
        return res.status(400).json({ error: 'Invalid name or admin key' });
    }
    const rounds = parseInt(totalRounds) || 5;
    const id = (0, crypto_1.randomUUID)();
    const grandPrix = isGrandPrix === undefined ? 1 : (isGrandPrix ? 1 : 0);
    // Generate unique slug
    let baseSlug = slugify(name);
    let slug = baseSlug || 'torneo-' + id.substring(0, 8);
    let isUnique = false;
    let attempt = 0;
    try {
        while (!isUnique) {
            const check = await db_1.db.execute({
                sql: 'SELECT id FROM tournaments WHERE slug = ?',
                args: [slug]
            });
            if (check.rows.length === 0) {
                isUnique = true;
            }
            else {
                attempt++;
                slug = `${baseSlug}-${attempt}`;
            }
        }
        await db_1.db.execute({
            sql: 'INSERT INTO tournaments (id, club_id, name, slug, status, total_rounds, is_grand_prix, admin_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            args: [id, clubId || null, name, slug, 'created', rounds, grandPrix, adminKey.trim()]
        });
        res.json({ id, name, slug, status: 'created', total_rounds: rounds, is_grand_prix: grandPrix, club_id: clubId || null });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
// PUT update tournament name and adminKey
app.put('/api/tournaments/:id', async (req, res) => {
    const { id } = req.params;
    const { name, adminKey } = req.body;
    if (!name || name.trim() === '' || !adminKey || adminKey.trim() === '') {
        return res.status(400).json({ error: 'Name and adminKey are required' });
    }
    try {
        // Regenerate unique slug based on new name
        let baseSlug = slugify(name);
        let slug = baseSlug || 'torneo-' + id.substring(0, 8);
        let isUnique = false;
        let attempt = 0;
        while (!isUnique) {
            const check = await db_1.db.execute({
                sql: 'SELECT id FROM tournaments WHERE slug = ? AND id != ?',
                args: [slug, id]
            });
            if (check.rows.length === 0) {
                isUnique = true;
            }
            else {
                attempt++;
                slug = `${baseSlug}-${attempt}`;
            }
        }
        await db_1.db.execute({
            sql: 'UPDATE tournaments SET name = ?, slug = ?, admin_key = ? WHERE id = ?',
            args: [name.trim(), slug, adminKey.trim(), id]
        });
        res.json({ success: true, slug });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
app.get('/api/tournaments/:idOrSlug', async (req, res) => {
    const { idOrSlug } = req.params;
    try {
        // Find tournament by ID or Slug, join clubs to get the slug as well
        const tResult = await db_1.db.execute({
            sql: `SELECT t.id, t.club_id, t.name, t.slug, t.status, t.total_rounds, t.is_grand_prix, t.created_at,
            c.slug AS club_slug
            FROM tournaments t
            LEFT JOIN clubs c ON t.club_id = c.id
            WHERE t.id = ? OR t.slug = ?`,
            args: [idOrSlug, idOrSlug]
        });
        if (tResult.rows.length === 0)
            return res.status(404).json({ error: 'Tournament not found' });
        const tournament = tResult.rows[0];
        const id = tournament.id; // Actual UUID of the tournament
        const pResult = await db_1.db.execute({
            sql: `SELECT p.* FROM players p 
            JOIN tournament_participants tp ON p.id = tp.player_id 
            WHERE tp.tournament_id = ? ORDER BY p.name ASC`,
            args: [id]
        });
        const players = pResult.rows;
        const rResult = await db_1.db.execute({
            sql: 'SELECT * FROM rounds WHERE tournament_id = ? ORDER BY round_number ASC',
            args: [id]
        });
        const rounds = rResult.rows;
        const mResult = await db_1.db.execute({
            sql: `
        SELECT m.*, 
               pw.name AS white_player_name, 
               COALESCE(pb.name, 'Descansa') AS black_player_name,
               r.round_number
        FROM matches m
        JOIN players pw ON m.white_player_id = pw.id
        LEFT JOIN players pb ON m.black_player_id = pb.id
        JOIN rounds r ON m.round_id = r.id
        WHERE m.tournament_id = ?
        ORDER BY r.round_number ASC
      `,
            args: [id]
        });
        const matches = mResult.rows;
        const participants = players.map((p, index) => ({ id: p.id, seed: index + 1 }));
        const matchHistory = matches
            .filter((m) => m.result !== null)
            .map((m) => ({
            round: m.round_number,
            home: { id: m.white_player_id, points: m.result === '1-0' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 },
            away: { id: m.black_player_id, points: m.result === '0-1' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 }
        }));
        // --- Calculate standings directly (accurate regardless of library quirks) ---
        const pointsMap = new Map();
        const opponentsMap = new Map(); // player -> list of opponent ids
        for (const p of players) {
            pointsMap.set(p.id, 0);
            opponentsMap.set(p.id, []);
        }
        for (const m of matches) {
            if (!m.result || m.is_bye === 1)
                continue;
            const wid = m.white_player_id;
            const bid = m.black_player_id;
            if (m.result === '1-0') {
                pointsMap.set(wid, (pointsMap.get(wid) || 0) + 1);
            }
            else if (m.result === '0-1') {
                pointsMap.set(bid, (pointsMap.get(bid) || 0) + 1);
            }
            else if (m.result === '0.5-0.5') {
                pointsMap.set(wid, (pointsMap.get(wid) || 0) + 0.5);
                pointsMap.set(bid, (pointsMap.get(bid) || 0) + 0.5);
            }
            opponentsMap.get(wid)?.push(bid);
            opponentsMap.get(bid)?.push(wid);
        }
        // Buchholz tiebreaker: sum of opponents' points
        const standings = players.map((p) => {
            const pid = p.id;
            const pts = pointsMap.get(pid) || 0;
            const buchholz = (opponentsMap.get(pid) || []).reduce((sum, oppId) => sum + (pointsMap.get(oppId) || 0), 0);
            return { id: pid, name: p.name, points: pts, sb: Math.round(buchholz * 10) / 10, played: (opponentsMap.get(pid) || []).length };
        }).sort((a, b) => b.points - a.points || b.sb - a.sb);
        res.json({ tournament, players, rounds, matches, standings });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
app.post('/api/tournaments/:id/checkin', async (req, res) => {
    const { id } = req.params;
    const { playerIds } = req.body;
    try {
        if (!(await verifyTournamentAdminKey(id, req)))
            return res.status(403).json({ error: 'Unauthorized' });
        const tRes = await db_1.db.execute({ sql: 'SELECT status FROM tournaments WHERE id = ?', args: [id] });
        if (tRes.rows[0]?.status !== 'created')
            return res.status(400).json({ error: 'Cannot check-in after started' });
        await db_1.db.execute({ sql: 'DELETE FROM tournament_participants WHERE tournament_id = ?', args: [id] });
        for (const pid of playerIds) {
            await db_1.db.execute({ sql: 'INSERT INTO tournament_participants (tournament_id, player_id) VALUES (?, ?)', args: [id, pid] });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
app.post('/api/tournaments/:id/start', async (req, res) => {
    const { id } = req.params;
    try {
        if (!(await verifyTournamentAdminKey(id, req)))
            return res.status(403).json({ error: 'Unauthorized' });
        const tRes = await db_1.db.execute({ sql: 'SELECT status FROM tournaments WHERE id = ?', args: [id] });
        if (tRes.rows[0]?.status !== 'created')
            return res.status(400).json({ error: 'Already started' });
        await db_1.db.execute({ sql: "UPDATE tournaments SET status = 'in_progress' WHERE id = ?", args: [id] });
        const pResult = await db_1.db.execute({ sql: 'SELECT player_id FROM tournament_participants WHERE tournament_id = ?', args: [id] });
        const participants = pResult.rows.map((r, idx) => ({ id: r.player_id, seed: idx + 1 }));
        if (participants.length < 2)
            return res.status(400).json({ error: 'Need at least 2 players' });
        const roundId = (0, crypto_1.randomUUID)();
        await db_1.db.execute({ sql: 'INSERT INTO rounds (id, tournament_id, round_number, status) VALUES (?, ?, ?, ?)', args: [roundId, id, 1, 'pending'] });
        const matchups = (0, swiss_1.generateNextRound)(1, participants, []);
        for (const m of matchups) {
            await db_1.db.execute({
                sql: 'INSERT INTO matches (id, tournament_id, round_id, white_player_id, black_player_id, is_bye) VALUES (?, ?, ?, ?, ?, ?)',
                args: [(0, crypto_1.randomUUID)(), id, roundId, m.whitePlayerId, m.blackPlayerId, m.isBye ? 1 : 0]
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
app.post('/api/tournaments/:id/next-round', async (req, res) => {
    const { id } = req.params;
    try {
        if (!(await verifyTournamentAdminKey(id, req)))
            return res.status(403).json({ error: 'Unauthorized' });
        const rRes = await db_1.db.execute({ sql: 'SELECT * FROM rounds WHERE tournament_id = ? ORDER BY round_number DESC LIMIT 1', args: [id] });
        if (rRes.rows.length === 0)
            return res.status(400).json({ error: 'No active rounds' });
        const lastRound = rRes.rows[0];
        if (lastRound.status !== 'completed')
            return res.status(400).json({ error: 'Current round is not completed yet' });
        const nextRoundNumber = lastRound.round_number + 1;
        const mRes = await db_1.db.execute({ sql: 'SELECT m.*, r.round_number FROM matches m JOIN rounds r ON m.round_id = r.id WHERE m.tournament_id = ?', args: [id] });
        const matchHistory = mRes.rows.map((m) => ({
            round: m.round_number,
            home: { id: m.white_player_id, points: m.result === '1-0' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 },
            away: { id: m.black_player_id, points: m.result === '0-1' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 }
        }));
        const pResult = await db_1.db.execute({ sql: 'SELECT player_id FROM tournament_participants WHERE tournament_id = ?', args: [id] });
        const participants = pResult.rows.map((r, idx) => ({ id: r.player_id, seed: idx + 1 }));
        const roundId = (0, crypto_1.randomUUID)();
        await db_1.db.execute({ sql: 'INSERT INTO rounds (id, tournament_id, round_number, status) VALUES (?, ?, ?, ?)', args: [roundId, id, nextRoundNumber, 'pending'] });
        const matchups = (0, swiss_1.generateNextRound)(nextRoundNumber, participants, matchHistory);
        for (const m of matchups) {
            await db_1.db.execute({
                sql: 'INSERT INTO matches (id, tournament_id, round_id, white_player_id, black_player_id, is_bye) VALUES (?, ?, ?, ?, ?, ?)',
                args: [(0, crypto_1.randomUUID)(), id, roundId, m.whitePlayerId, m.blackPlayerId, m.isBye ? 1 : 0]
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
app.post('/api/matches/:id/result', async (req, res) => {
    const { id } = req.params;
    const { result } = req.body;
    try {
        const mRes = await db_1.db.execute({ sql: 'SELECT tournament_id, round_id FROM matches WHERE id = ?', args: [id] });
        if (mRes.rows.length === 0)
            return res.status(404).json({ error: 'Match not found' });
        const tournamentId = mRes.rows[0].tournament_id;
        const roundId = mRes.rows[0].round_id;
        if (!(await verifyTournamentAdminKey(tournamentId, req)))
            return res.status(403).json({ error: 'Unauthorized' });
        await db_1.db.execute({ sql: 'UPDATE matches SET result = ? WHERE id = ?', args: [result, id] });
        const roundMatchesRes = await db_1.db.execute({
            sql: 'SELECT COUNT(*) as total, SUM(CASE WHEN result IS NOT NULL THEN 1 ELSE 0 END) as completed FROM matches WHERE round_id = ? AND is_bye = 0',
            args: [roundId]
        });
        const roundStats = roundMatchesRes.rows[0];
        if (roundStats.total === roundStats.completed) {
            await db_1.db.execute({ sql: "UPDATE rounds SET status = 'completed' WHERE id = ?", args: [roundId] });
        }
        else {
            await db_1.db.execute({ sql: "UPDATE rounds SET status = 'pending' WHERE id = ?", args: [roundId] });
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
app.post('/api/tournaments/:id/complete', async (req, res) => {
    const { id } = req.params;
    try {
        if (!(await verifyTournamentAdminKey(id, req)))
            return res.status(403).json({ error: 'Unauthorized' });
        const tRes = await db_1.db.execute({ sql: 'SELECT * FROM tournaments WHERE id = ?', args: [id] });
        const tournament = tRes.rows[0];
        await db_1.db.execute({ sql: "UPDATE tournaments SET status = 'completed' WHERE id = ?", args: [id] });
        const pResult = await db_1.db.execute({
            sql: `SELECT p.id FROM players p JOIN tournament_participants tp ON p.id = tp.player_id WHERE tp.tournament_id = ?`,
            args: [id]
        });
        const playerIds = pResult.rows.map((r) => r.id);
        const mRes = await db_1.db.execute({
            sql: 'SELECT white_player_id, black_player_id, result, is_bye FROM matches WHERE tournament_id = ?',
            args: [id]
        });
        // Direct standings calculation (same as GET /tournaments/:id)
        const pointsMap = new Map();
        const opponentsMap = new Map();
        for (const pid of playerIds) {
            pointsMap.set(pid, 0);
            opponentsMap.set(pid, []);
        }
        for (const m of mRes.rows) {
            if (!m.result || m.is_bye === 1)
                continue;
            const wid = m.white_player_id;
            const bid = m.black_player_id;
            if (m.result === '1-0')
                pointsMap.set(wid, (pointsMap.get(wid) || 0) + 1);
            else if (m.result === '0-1')
                pointsMap.set(bid, (pointsMap.get(bid) || 0) + 1);
            else if (m.result === '0.5-0.5') {
                pointsMap.set(wid, (pointsMap.get(wid) || 0) + 0.5);
                pointsMap.set(bid, (pointsMap.get(bid) || 0) + 0.5);
            }
            opponentsMap.get(wid)?.push(bid);
            opponentsMap.get(bid)?.push(wid);
        }
        const sortedStandings = playerIds.map(pid => {
            const pts = pointsMap.get(pid) || 0;
            const buchholz = (opponentsMap.get(pid) || []).reduce((s, opp) => s + (pointsMap.get(opp) || 0), 0);
            return { id: pid, pts, buchholz };
        }).sort((a, b) => b.pts - a.pts || b.buchholz - a.buchholz);
        // Award GP points if club Grand Prix tournament
        if (tournament.club_id && tournament.is_grand_prix === 1) {
            const gpPointsMap = [10, 8, 6, 4, 2]; // 1st–5th
            const gpParticipation = 2; // 6th onwards
            for (let i = 0; i < sortedStandings.length; i++) {
                const pointsToAward = i < gpPointsMap.length ? gpPointsMap[i] : gpParticipation;
                await db_1.db.execute({
                    sql: 'UPDATE players SET grand_prix_points = grand_prix_points + ? WHERE id = ?',
                    args: [pointsToAward, sortedStandings[i].id]
                });
            }
        }
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
app.delete('/api/tournaments/:id', async (req, res) => {
    const { id } = req.params;
    if (!(await verifyTournamentAdminKey(id, req)))
        return res.status(403).json({ error: 'Unauthorized' });
    await db_1.db.execute({ sql: 'DELETE FROM tournaments WHERE id = ?', args: [id] });
    res.json({ success: true });
});
app.patch('/api/tournaments/:id/archive', async (req, res) => {
    const { id } = req.params;
    if (!(await verifyTournamentAdminKey(id, req)))
        return res.status(403).json({ error: 'Unauthorized' });
    const { unarchive } = req.body;
    if (unarchive) {
        await db_1.db.execute({ sql: "UPDATE tournaments SET status = 'completed' WHERE id = ?", args: [id] });
    }
    else {
        await db_1.db.execute({ sql: "UPDATE tournaments SET status = 'archived' WHERE id = ?", args: [id] });
    }
    res.json({ success: true });
});
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, '../dist/index.html'));
    });
}
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

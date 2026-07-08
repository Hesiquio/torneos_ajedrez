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
// ================= CLUBS (SUPER ADMIN) =================
app.get('/api/admin/clubs', verifyGlobalAdmin, async (req, res) => {
    if (req.user.role !== 'SUPER_ADMIN')
        return res.status(403).json({ error: 'Forbidden' });
    try {
        const result = await db_1.db.execute('SELECT * FROM clubs ORDER BY created_at DESC');
        res.json(result.rows);
    }
    catch (e) {
        res.status(500).json({ error: 'DB Error' });
    }
});
// ================= PLAYERS =================
app.get('/api/players', async (req, res) => {
    try {
        const clubId = req.query.club_id;
        let sql = 'SELECT * FROM players WHERE club_id IS NULL ORDER BY grand_prix_points DESC, name ASC';
        let args = [];
        if (clubId && clubId !== 'null') {
            sql = 'SELECT * FROM players WHERE club_id = ? ORDER BY grand_prix_points DESC, name ASC';
            args = [clubId];
        }
        const result = await db_1.db.execute({ sql, args });
        res.json(result.rows);
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
        await db_1.db.execute({
            sql: 'INSERT INTO players (id, club_id, name, age) VALUES (?, ?, ?, ?)',
            args: [id, clubId || null, name.trim(), age ? parseInt(age) : null]
        });
        res.json({ id, club_id: clubId || null, name: name.trim(), age, grand_prix_points: 0 });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
app.put('/api/players/:id', verifyGlobalAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, age, grand_prix_points } = req.body;
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
        await db_1.db.execute({
            sql: 'UPDATE players SET name = ?, age = ?, grand_prix_points = ? WHERE id = ?',
            args: [name.trim(), age ? parseInt(age) : null, grand_prix_points !== undefined ? parseFloat(grand_prix_points) : 0, id]
        });
        res.json({ success: true });
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
        const showArchived = req.query.archived === 'true';
        let sql = '';
        let args = [];
        if (clubId && clubId !== 'null') {
            sql = showArchived
                ? "SELECT id, name, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE club_id = ? AND status = 'archived' ORDER BY created_at DESC"
                : "SELECT id, name, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE club_id = ? AND status != 'archived' ORDER BY created_at DESC";
            args = [clubId];
        }
        else {
            sql = showArchived
                ? "SELECT id, name, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE club_id IS NULL AND status = 'archived' ORDER BY created_at DESC"
                : "SELECT id, name, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE club_id IS NULL AND status != 'archived' ORDER BY created_at DESC";
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
    try {
        await db_1.db.execute({
            sql: 'INSERT INTO tournaments (id, club_id, name, status, total_rounds, is_grand_prix, admin_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
            args: [id, clubId || null, name, 'created', rounds, grandPrix, adminKey.trim()]
        });
        res.json({ id, name, status: 'created', total_rounds: rounds, is_grand_prix: grandPrix, club_id: clubId || null });
    }
    catch (error) {
        res.status(500).json({ error: 'Database error' });
    }
});
app.get('/api/tournaments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const tResult = await db_1.db.execute({
            sql: 'SELECT id, club_id, name, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE id = ?',
            args: [id]
        });
        if (tResult.rows.length === 0)
            return res.status(404).json({ error: 'Tournament not found' });
        const tournament = tResult.rows[0];
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
        const matchHistory = matches.map((m) => ({
            round: m.round_number,
            home: { id: m.white_player_id, points: m.result === '1-0' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 },
            away: { id: m.black_player_id, points: m.result === '0-1' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 }
        }));
        let standings = [];
        if (players.length > 0 && matchHistory.length > 0) {
            const swissStandings = (0, swiss_1.calculateSwissStandings)(rounds.length, participants, matchHistory);
            standings = swissStandings.map((s) => {
                const p = players.find((pl) => pl.id === s.id);
                return {
                    id: s.id,
                    name: p ? p.name : 'Unknown',
                    points: s.wins,
                    sb: s.tiebreaker,
                    played: matches.filter((m) => (m.white_player_id === s.id || m.black_player_id === s.id) && m.result).length
                };
            });
        }
        else {
            standings = players.map((p) => ({ id: p.id, name: p.name, points: 0, sb: 0, played: 0 }));
        }
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
        const pResult = await db_1.db.execute({ sql: 'SELECT player_id FROM tournament_participants WHERE tournament_id = ?', args: [id] });
        const participants = pResult.rows.map((r, idx) => ({ id: r.player_id, seed: idx + 1 }));
        const rResult = await db_1.db.execute({ sql: 'SELECT * FROM rounds WHERE tournament_id = ?', args: [id] });
        const mRes = await db_1.db.execute({ sql: 'SELECT m.*, r.round_number FROM matches m JOIN rounds r ON m.round_id = r.id WHERE m.tournament_id = ?', args: [id] });
        const matchHistory = mRes.rows.map((m) => ({
            round: m.round_number,
            home: { id: m.white_player_id, points: m.result === '1-0' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 },
            away: { id: m.black_player_id, points: m.result === '0-1' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 }
        }));
        const swissStandings = (0, swiss_1.calculateSwissStandings)(rResult.rows.length, participants, matchHistory);
        // Solo repartimos puntos GP si el torneo pertenece a un club y está marcado como Grand Prix
        if (tournament.club_id && tournament.is_grand_prix === 1) {
            const gpPointsMap = [10, 8, 6, 4, 2];
            for (let i = 0; i < swissStandings.length; i++) {
                const pid = swissStandings[i].id;
                const pointsToAward = i < gpPointsMap.length ? gpPointsMap[i] : 1;
                await db_1.db.execute({
                    sql: 'UPDATE players SET grand_prix_points = grand_prix_points + ? WHERE id = ?',
                    args: [pointsToAward, pid]
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

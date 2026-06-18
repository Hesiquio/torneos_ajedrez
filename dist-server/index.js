"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const db_1 = require("./db");
const scheduler_1 = require("./scheduler");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const PORT = process.env.PORT || 3001;
// Serve static files from React build directory (dist) in production
if (process.env.NODE_ENV === 'production') {
    app.use(express_1.default.static(path_1.default.join(__dirname, '../dist')));
}
// Admin authorization checker
async function verifyTournamentAdminKey(tournamentId, req) {
    const providedKey = req.headers['x-admin-key'] || req.body.adminKey;
    if (!providedKey)
        return false;
    try {
        const result = await db_1.db.execute({
            sql: 'SELECT admin_key FROM tournaments WHERE id = ?',
            args: [tournamentId]
        });
        if (result.rows.length === 0)
            return false;
        return result.rows[0].admin_key === providedKey;
    }
    catch (e) {
        return false;
    }
}
// 1. Get all tournaments (without admin_key)
app.get('/api/tournaments', async (req, res) => {
    try {
        const result = await db_1.db.execute('SELECT id, name, type, status, created_at FROM tournaments ORDER BY created_at DESC');
        res.json(result.rows);
    }
    catch (error) {
        console.error('Error fetching tournaments:', error);
        res.status(500).json({ error: 'Database error' });
    }
});
// 2. Create a tournament
app.post('/api/tournaments', async (req, res) => {
    const { name, type, adminKey } = req.body;
    if (!name || !type || (type !== 'single' && type !== 'double') || !adminKey || adminKey.trim() === '') {
        return res.status(400).json({ error: 'Invalid name, tournament type or admin key' });
    }
    const id = (0, crypto_1.randomUUID)();
    try {
        await db_1.db.execute({
            sql: 'INSERT INTO tournaments (id, name, type, status, admin_key) VALUES (?, ?, ?, ?, ?)',
            args: [id, name, type, 'created', adminKey.trim()]
        });
        res.json({ id, name, type, status: 'created' });
    }
    catch (error) {
        console.error('Error creating tournament:', error);
        res.status(500).json({ error: 'Database error' });
    }
});
// 3. Get tournament details (players, rounds, matches, standings - safe fields only)
app.get('/api/tournaments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Get tournament info
        const tResult = await db_1.db.execute({
            sql: 'SELECT id, name, type, status, created_at FROM tournaments WHERE id = ?',
            args: [id]
        });
        if (tResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        const tournament = tResult.rows[0];
        // 2. Get players
        const pResult = await db_1.db.execute({
            sql: 'SELECT * FROM players WHERE tournament_id = ? ORDER BY name ASC',
            args: [id]
        });
        const players = pResult.rows;
        // 3. Get rounds
        const rResult = await db_1.db.execute({
            sql: 'SELECT * FROM rounds WHERE tournament_id = ? ORDER BY round_number ASC',
            args: [id]
        });
        const rounds = rResult.rows;
        // 4. Get matches with player names
        const mResult = await db_1.db.execute({
            sql: `
        SELECT m.*, 
               pw.name AS white_player_name, 
               pb.name AS black_player_name,
               r.round_number
        FROM matches m
        JOIN players pw ON m.white_player_id = pw.id
        JOIN players pb ON m.black_player_id = pb.id
        JOIN rounds r ON m.round_id = r.id
        WHERE m.tournament_id = ?
        ORDER BY r.round_number ASC
      `,
            args: [id]
        });
        const matches = mResult.rows;
        // 5. Calculate standings dynamically
        const standingsMap = new Map();
        // Initialize map
        players.forEach((p) => {
            standingsMap.set(p.id, {
                id: p.id,
                name: p.name,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                points: 0,
                sb: 0
            });
        });
        // Populate standard wins/losses/draws/points
        matches.forEach((m) => {
            if (m.result) {
                const white = standingsMap.get(m.white_player_id);
                const black = standingsMap.get(m.black_player_id);
                if (white && black) {
                    white.played++;
                    black.played++;
                    if (m.result === '1-0') {
                        white.won++;
                        white.points += 1;
                        black.lost++;
                    }
                    else if (m.result === '0-1') {
                        black.won++;
                        black.points += 1;
                        white.lost++;
                    }
                    else if (m.result === '0.5-0.5') {
                        white.drawn++;
                        white.points += 0.5;
                        black.drawn++;
                        black.points += 0.5;
                    }
                }
            }
        });
        // Calculate Sonneborn-Berger Score
        // SB = sum of points of opponents you defeated + half the points of opponents you drew with
        matches.forEach((m) => {
            if (m.result) {
                const white = standingsMap.get(m.white_player_id);
                const black = standingsMap.get(m.black_player_id);
                if (white && black) {
                    if (m.result === '1-0') {
                        white.sb += black.points;
                    }
                    else if (m.result === '0-1') {
                        black.sb += white.points;
                    }
                    else if (m.result === '0.5-0.5') {
                        white.sb += black.points * 0.5;
                        black.sb += white.points * 0.5;
                    }
                }
            }
        });
        const standings = Array.from(standingsMap.values()).sort((a, b) => {
            if (b.points !== a.points)
                return b.points - a.points;
            if (b.sb !== a.sb)
                return b.sb - a.sb;
            return a.name.localeCompare(b.name);
        });
        res.json({
            tournament,
            players,
            rounds,
            matches,
            standings
        });
    }
    catch (error) {
        console.error('Error fetching tournament details:', error);
        res.status(500).json({ error: 'Database error' });
    }
});
// 4. Add player to tournament
app.post('/api/tournaments/:id/players', async (req, res) => {
    const { id } = req.params;
    const { name, age } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Player name is required' });
    }
    try {
        // Verify admin key
        if (!(await verifyTournamentAdminKey(id, req))) {
            return res.status(403).json({ error: 'Unauthorized: Invalid admin key' });
        }
        // Check tournament status
        const tResult = await db_1.db.execute({
            sql: 'SELECT status, type FROM tournaments WHERE id = ?',
            args: [id]
        });
        if (tResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        const { status, type } = tResult.rows[0];
        const playerId = (0, crypto_1.randomUUID)();
        // 1. Insert player
        await db_1.db.execute({
            sql: 'INSERT INTO players (id, tournament_id, name, age) VALUES (?, ?, ?, ?)',
            args: [playerId, id, name.trim(), age ? parseInt(age) : null]
        });
        // 2. If tournament is already in progress, dynamically generate catch-up matches
        if (status === 'in_progress') {
            // Find all existing players (excluding the new one)
            const existingPlayersRes = await db_1.db.execute({
                sql: 'SELECT id FROM players WHERE tournament_id = ? AND id != ?',
                args: [id, playerId]
            });
            const existingPlayerIds = existingPlayersRes.rows.map((r) => r.id);
            if (existingPlayerIds.length > 0) {
                // Find highest round number
                const roundsRes = await db_1.db.execute({
                    sql: 'SELECT COALESCE(MAX(round_number), 0) as max_round FROM rounds WHERE tournament_id = ?',
                    args: [id]
                });
                const startRoundNum = (roundsRes.rows[0].max_round || 0) + 1;
                // Generate catch-up rounds
                const doubleRound = type === 'double';
                const catchUpRounds = (0, scheduler_1.generateCatchUpMatches)(playerId, existingPlayerIds, doubleRound, startRoundNum);
                // Save new rounds and matches in a transaction or batch
                for (const round of catchUpRounds) {
                    const roundId = (0, crypto_1.randomUUID)();
                    await db_1.db.execute({
                        sql: 'INSERT INTO rounds (id, tournament_id, round_number, status) VALUES (?, ?, ?, ?)',
                        args: [roundId, id, round.roundNumber, 'pending']
                    });
                    for (const m of round.matches) {
                        await db_1.db.execute({
                            sql: 'INSERT INTO matches (id, tournament_id, round_id, white_player_id, black_player_id) VALUES (?, ?, ?, ?, ?)',
                            args: [m.id, id, roundId, m.whitePlayerId, m.blackPlayerId]
                        });
                    }
                }
            }
        }
        res.json({ id: playerId, name: name.trim(), addedMidTournament: status === 'in_progress' });
    }
    catch (error) {
        console.error('Error adding player:', error);
        res.status(500).json({ error: 'Database error' });
    }
});
// 5. Start tournament (generates full fixture for all players added)
app.post('/api/tournaments/:id/start', async (req, res) => {
    const { id } = req.params;
    try {
        if (!(await verifyTournamentAdminKey(id, req))) {
            return res.status(403).json({ error: 'Unauthorized: Invalid admin key' });
        }
        const tResult = await db_1.db.execute({
            sql: 'SELECT status, type FROM tournaments WHERE id = ?',
            args: [id]
        });
        if (tResult.rows.length === 0) {
            return res.status(404).json({ error: 'Tournament not found' });
        }
        const { status, type } = tResult.rows[0];
        if (status !== 'created') {
            return res.status(400).json({ error: 'Tournament is already started or completed' });
        }
        // Get players
        const playersRes = await db_1.db.execute({
            sql: 'SELECT id, name FROM players WHERE tournament_id = ?',
            args: [id]
        });
        const players = playersRes.rows.map((r) => ({ id: r.id, name: r.name }));
        if (players.length < 2) {
            return res.status(400).json({ error: 'At least 2 players are required to start the tournament' });
        }
        // Update status immediately to prevent duplicate runs from rapid clicking
        await db_1.db.execute({
            sql: "UPDATE tournaments SET status = 'in_progress' WHERE id = ?",
            args: [id]
        });
        // Generate rounds and matches
        const doubleRound = type === 'double';
        const fixture = (0, scheduler_1.generateRoundRobin)(players, doubleRound);
        // Save fixture
        for (const round of fixture) {
            const roundId = (0, crypto_1.randomUUID)();
            await db_1.db.execute({
                sql: 'INSERT INTO rounds (id, tournament_id, round_number, status) VALUES (?, ?, ?, ?)',
                args: [roundId, id, round.roundNumber, 'pending']
            });
            for (const m of round.matches) {
                await db_1.db.execute({
                    sql: 'INSERT INTO matches (id, tournament_id, round_id, white_player_id, black_player_id) VALUES (?, ?, ?, ?, ?)',
                    args: [m.id, id, roundId, m.whitePlayerId, m.blackPlayerId]
                });
            }
        }
        res.json({ success: true, message: 'Tournament started and fixture generated.' });
    }
    catch (error) {
        console.error('Error starting tournament:', error);
        res.status(500).json({ error: 'Database error' });
    }
});
// 5.5. Reset/Re-draw tournament (clears matches/rounds, sets status back to 'created')
app.post('/api/tournaments/:id/reset', async (req, res) => {
    const { id } = req.params;
    try {
        if (!(await verifyTournamentAdminKey(id, req))) {
            return res.status(403).json({ error: 'Unauthorized: Invalid admin key' });
        }
        // Delete matches and rounds
        await db_1.db.execute({
            sql: 'DELETE FROM matches WHERE tournament_id = ?',
            args: [id]
        });
        await db_1.db.execute({
            sql: 'DELETE FROM rounds WHERE tournament_id = ?',
            args: [id]
        });
        // Update status back to 'created'
        await db_1.db.execute({
            sql: "UPDATE tournaments SET status = 'created' WHERE id = ?",
            args: [id]
        });
        res.json({ success: true, message: 'Tournament rounds cleared and reset to draft mode.' });
    }
    catch (error) {
        console.error('Error resetting tournament:', error);
        res.status(500).json({ error: 'Database error' });
    }
});
// 6. Update match result
app.post('/api/matches/:id/result', async (req, res) => {
    const { id } = req.params;
    const { result } = req.body; // '1-0', '0-1', '0.5-0.5', or null
    if (result !== undefined && result !== null && result !== '1-0' && result !== '0-1' && result !== '0.5-0.5') {
        return res.status(400).json({ error: 'Invalid match result' });
    }
    try {
        // 1. Fetch tournament associated with this match
        const mRes = await db_1.db.execute({
            sql: 'SELECT tournament_id, round_id FROM matches WHERE id = ?',
            args: [id]
        });
        if (mRes.rows.length === 0) {
            return res.status(404).json({ error: 'Match not found' });
        }
        const tournamentId = mRes.rows[0].tournament_id;
        const roundId = mRes.rows[0].round_id;
        // 2. Verify admin key
        if (!(await verifyTournamentAdminKey(tournamentId, req))) {
            return res.status(403).json({ error: 'Unauthorized: Invalid admin key' });
        }
        await db_1.db.execute({
            sql: 'UPDATE matches SET result = ? WHERE id = ?',
            args: [result, id]
        });
        // Check if all matches in the tournament are completed to mark it as completed
        // Update round status if all matches in this round are completed
        const roundMatchesRes = await db_1.db.execute({
            sql: 'SELECT COUNT(*) as total, SUM(CASE WHEN result IS NOT NULL THEN 1 ELSE 0 END) as completed FROM matches WHERE round_id = ?',
            args: [roundId]
        });
        const roundStats = roundMatchesRes.rows[0];
        if (roundStats.total === roundStats.completed) {
            await db_1.db.execute({
                sql: "UPDATE rounds SET status = 'completed' WHERE id = ?",
                args: [roundId]
            });
        }
        else {
            await db_1.db.execute({
                sql: "UPDATE rounds SET status = 'pending' WHERE id = ?",
                args: [roundId]
            });
        }
        // Check tournament completion
        const tMatchesRes = await db_1.db.execute({
            sql: 'SELECT COUNT(*) as total, SUM(CASE WHEN result IS NOT NULL THEN 1 ELSE 0 END) as completed FROM matches WHERE tournament_id = ?',
            args: [tournamentId]
        });
        const tStats = tMatchesRes.rows[0];
        if (tStats.total > 0 && tStats.total === tStats.completed) {
            await db_1.db.execute({
                sql: "UPDATE tournaments SET status = 'completed' WHERE id = ?",
                args: [tournamentId]
            });
        }
        else {
            await db_1.db.execute({
                sql: "UPDATE tournaments SET status = 'in_progress' WHERE id = ?",
                args: [tournamentId]
            });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating match result:', error);
        res.status(500).json({ error: 'Database error' });
    }
});
// 6.5. Update player info
app.put('/api/players/:id', async (req, res) => {
    const { id } = req.params;
    const { name, age } = req.body;
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Player name is required' });
    }
    try {
        // Get tournament id
        const pRes = await db_1.db.execute({
            sql: 'SELECT tournament_id FROM players WHERE id = ?',
            args: [id]
        });
        if (pRes.rows.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }
        const tournamentId = pRes.rows[0].tournament_id;
        // Verify admin key
        if (!(await verifyTournamentAdminKey(tournamentId, req))) {
            return res.status(403).json({ error: 'Unauthorized: Invalid admin key' });
        }
        await db_1.db.execute({
            sql: 'UPDATE players SET name = ?, age = ? WHERE id = ?',
            args: [name.trim(), age ? parseInt(age) : null, id]
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error updating player:', error);
        res.status(500).json({ error: 'Database error' });
    }
});
// 7. Delete tournament
app.delete('/api/tournaments/:id', async (req, res) => {
    const { id } = req.params;
    try {
        if (!(await verifyTournamentAdminKey(id, req))) {
            return res.status(403).json({ error: 'Unauthorized: Invalid admin key' });
        }
        await db_1.db.execute({
            sql: 'DELETE FROM tournaments WHERE id = ?',
            args: [id]
        });
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error deleting tournament:', error);
        res.status(500).json({ error: 'Database error' });
    }
});
// Fallback for SPA Routing in Production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, '../dist/index.html'));
    });
}
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

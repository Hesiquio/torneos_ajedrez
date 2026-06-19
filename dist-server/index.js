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
// 0. Verify admin key (used by frontend before unlocking admin UI)
app.post('/api/tournaments/:id/verify-admin', async (req, res) => {
    const { id } = req.params;
    const isValid = await verifyTournamentAdminKey(id, req);
    if (!isValid) {
        return res.status(403).json({ error: 'Clave de administración incorrecta.' });
    }
    res.json({ ok: true });
});
// 1. Get all tournaments (without admin_key)
// Pass ?archived=true to get archived tournaments, otherwise only non-archived are returned
app.get('/api/tournaments', async (req, res) => {
    try {
        const showArchived = req.query.archived === 'true';
        const sql = showArchived
            ? "SELECT id, name, type, status, created_at FROM tournaments WHERE status = 'archived' ORDER BY created_at DESC"
            : "SELECT id, name, type, status, created_at FROM tournaments WHERE status != 'archived' ORDER BY created_at DESC";
        const result = await db_1.db.execute(sql);
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
            // Ignore bye matches
            if (m.is_bye || m.black_player_id === 'BYE')
                return;
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
            if (m.is_bye || m.black_player_id === 'BYE')
                return;
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
                // Find existing rounds to fill
                const roundsData = await db_1.db.execute({
                    sql: `
            SELECT r.id, r.round_number, m.white_player_id, m.black_player_id
            FROM rounds r
            LEFT JOIN matches m ON r.id = m.round_id
            WHERE r.tournament_id = ? AND (m.is_bye = 0 OR m.is_bye IS NULL)
          `,
                    args: [id]
                });
                const roundsMap = new Map();
                roundsData.rows.forEach((row) => {
                    if (!roundsMap.has(row.id)) {
                        roundsMap.set(row.id, { id: row.id, roundNumber: row.round_number, busyPlayerIds: new Set() });
                    }
                    const rd = roundsMap.get(row.id);
                    if (row.white_player_id)
                        rd.busyPlayerIds.add(row.white_player_id);
                    if (row.black_player_id && row.black_player_id !== 'BYE')
                        rd.busyPlayerIds.add(row.black_player_id);
                });
                const existingRounds = Array.from(roundsMap.values()).sort((a, b) => a.roundNumber - b.roundNumber);
                const maxRoundNum = existingRounds.length > 0 ? existingRounds[existingRounds.length - 1].roundNumber : 0;
                const { roundAssignments, newRoundsNeeded } = (0, scheduler_1.assignMidTournamentMatches)(playerId, existingPlayerIds, type === 'double', existingRounds, maxRoundNum + 1);
                // Delete ALL existing BYE matches since we will regenerate them based on the new layout
                await db_1.db.execute({ sql: "DELETE FROM matches WHERE tournament_id = ? AND (is_bye = 1 OR black_player_id = 'BYE')", args: [id] });
                // Insert new rounds
                for (const nr of newRoundsNeeded) {
                    await db_1.db.execute({
                        sql: 'INSERT INTO rounds (id, tournament_id, round_number, status) VALUES (?, ?, ?, ?)',
                        args: [nr.id, id, nr.roundNumber, 'pending']
                    });
                }
                // Insert new matches
                for (const m of roundAssignments) {
                    await db_1.db.execute({
                        sql: 'INSERT INTO matches (id, tournament_id, round_id, white_player_id, black_player_id, is_bye) VALUES (?, ?, ?, ?, ?, 0)',
                        args: [(0, crypto_1.randomUUID)(), id, m.roundId, m.whitePlayerId, m.blackPlayerId]
                    });
                }
                // Regenerate BYE matches for anyone missing a match in any round
                const allRealMatches = await db_1.db.execute({ sql: "SELECT round_id, white_player_id, black_player_id FROM matches WHERE tournament_id = ?", args: [id] });
                const allPlayers = await db_1.db.execute({ sql: "SELECT id FROM players WHERE tournament_id = ?", args: [id] });
                const allRounds = await db_1.db.execute({ sql: "SELECT id FROM rounds WHERE tournament_id = ?", args: [id] });
                const playerIds = allPlayers.rows.map((r) => r.id);
                const matchesByRound = new Map();
                allRounds.rows.forEach((r) => matchesByRound.set(r.id, new Set()));
                allRealMatches.rows.forEach((m) => {
                    matchesByRound.get(m.round_id)?.add(m.white_player_id);
                    matchesByRound.get(m.round_id)?.add(m.black_player_id);
                });
                for (const [roundId, busyPlayers] of matchesByRound.entries()) {
                    for (const pId of playerIds) {
                        if (!busyPlayers.has(pId)) {
                            await db_1.db.execute({
                                sql: 'INSERT INTO matches (id, tournament_id, round_id, white_player_id, black_player_id, is_bye) VALUES (?, ?, ?, ?, ?, 1)',
                                args: [(0, crypto_1.randomUUID)(), id, roundId, pId, 'BYE']
                            });
                        }
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
                    sql: 'INSERT INTO matches (id, tournament_id, round_id, white_player_id, black_player_id, is_bye) VALUES (?, ?, ?, ?, ?, ?)',
                    args: [m.id, id, roundId, m.whitePlayerId, m.blackPlayerId, m.isBye ? 1 : 0]
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
// 5.4. Compress Rounds (Fixes tournaments with too many extra rounds by moving pending matches to empty slots)
app.post('/api/tournaments/:id/compress-rounds', async (req, res) => {
    const { id } = req.params;
    try {
        if (!(await verifyTournamentAdminKey(id, req))) {
            return res.status(403).json({ error: 'Unauthorized: Invalid admin key' });
        }
        // 1. Get all non-BYE matches
        const matchesRes = await db_1.db.execute({
            sql: 'SELECT id, round_id, white_player_id, black_player_id, result FROM matches WHERE tournament_id = ? AND (is_bye = 0 OR is_bye IS NULL) AND black_player_id != "BYE"',
            args: [id]
        });
        const allMatches = matchesRes.rows;
        // 2. Get all rounds
        const roundsRes = await db_1.db.execute({
            sql: 'SELECT id, round_number FROM rounds WHERE tournament_id = ? ORDER BY round_number ASC',
            args: [id]
        });
        const allRounds = roundsRes.rows.map((r) => ({ id: r.id, roundNumber: r.round_number, busyPlayerIds: new Set(), matchIds: [] }));
        // 3. Separate completed vs pending matches
        const completedMatches = allMatches.filter((m) => m.result && m.result !== 'pending');
        const pendingMatches = allMatches.filter((m) => !m.result || m.result === 'pending');
        // 4. Populate busy players from completed matches
        const roundMap = new Map();
        allRounds.forEach(r => roundMap.set(r.id, r));
        completedMatches.forEach((m) => {
            const r = roundMap.get(m.round_id);
            if (r) {
                r.busyPlayerIds.add(m.white_player_id);
                r.busyPlayerIds.add(m.black_player_id);
                r.matchIds.push(m.id);
            }
        });
        // 5. Reassign pending matches
        let nextRoundNum = allRounds.length > 0 ? Math.max(...allRounds.map(r => r.roundNumber)) + 1 : 1;
        const updates = [];
        pendingMatches.forEach((m) => {
            let assignedRoundId = null;
            // Try to fit in existing rounds
            for (const r of allRounds) {
                if (!r.busyPlayerIds.has(m.white_player_id) && !r.busyPlayerIds.has(m.black_player_id)) {
                    assignedRoundId = r.id;
                    r.busyPlayerIds.add(m.white_player_id);
                    r.busyPlayerIds.add(m.black_player_id);
                    r.matchIds.push(m.id);
                    break;
                }
            }
            // If no existing round fits, create a new one
            if (!assignedRoundId) {
                const newRoundId = (0, crypto_1.randomUUID)();
                const newRound = { id: newRoundId, roundNumber: nextRoundNum++, busyPlayerIds: new Set([m.white_player_id, m.black_player_id]), matchIds: [m.id] };
                allRounds.push(newRound);
                assignedRoundId = newRoundId;
            }
            if (assignedRoundId !== m.round_id) {
                updates.push({ matchId: m.id, newRoundId: assignedRoundId });
            }
        });
        // 6. Delete all old BYE matches
        await db_1.db.execute({ sql: "DELETE FROM matches WHERE tournament_id = ? AND (is_bye = 1 OR black_player_id = 'BYE')", args: [id] });
        // 7. Apply match round updates
        for (const u of updates) {
            await db_1.db.execute({ sql: 'UPDATE matches SET round_id = ? WHERE id = ?', args: [u.newRoundId, u.matchId] });
        }
        // 8. Insert newly created rounds if any
        const existingRoundIds = new Set(roundsRes.rows.map((r) => r.id));
        for (const r of allRounds) {
            if (!existingRoundIds.has(r.id)) {
                await db_1.db.execute({
                    sql: 'INSERT INTO rounds (id, tournament_id, round_number, status) VALUES (?, ?, ?, ?)',
                    args: [r.id, id, r.roundNumber, 'pending']
                });
            }
        }
        // 9. Delete empty rounds
        const roundsToDelete = allRounds.filter(r => r.matchIds.length === 0);
        for (const r of roundsToDelete) {
            await db_1.db.execute({ sql: 'DELETE FROM rounds WHERE id = ?', args: [r.id] });
        }
        const finalRounds = allRounds.filter(r => r.matchIds.length > 0).sort((a, b) => a.roundNumber - b.roundNumber);
        // 10. Renumber rounds sequentially to avoid gaps
        for (let i = 0; i < finalRounds.length; i++) {
            const correctNum = i + 1;
            if (finalRounds[i].roundNumber !== correctNum) {
                await db_1.db.execute({ sql: 'UPDATE rounds SET round_number = ? WHERE id = ?', args: [correctNum, finalRounds[i].id] });
                finalRounds[i].roundNumber = correctNum;
            }
        }
        // 11. Regenerate BYE matches for final rounds
        const playersRes = await db_1.db.execute({ sql: 'SELECT id FROM players WHERE tournament_id = ?', args: [id] });
        const playerIds = playersRes.rows.map((p) => p.id);
        for (const r of finalRounds) {
            for (const pId of playerIds) {
                if (!r.busyPlayerIds.has(pId)) {
                    await db_1.db.execute({
                        sql: 'INSERT INTO matches (id, tournament_id, round_id, white_player_id, black_player_id, is_bye) VALUES (?, ?, ?, ?, ?, 1)',
                        args: [(0, crypto_1.randomUUID)(), id, r.id, pId, 'BYE']
                    });
                }
            }
        }
        res.json({ success: true, message: 'Rounds compressed successfully' });
    }
    catch (error) {
        console.error('Error compressing rounds:', error);
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
// 7b. Archive (or unarchive) a tournament
app.patch('/api/tournaments/:id/archive', async (req, res) => {
    const { id } = req.params;
    const { unarchive } = req.body; // pass { unarchive: true } to restore
    try {
        if (!(await verifyTournamentAdminKey(id, req))) {
            return res.status(403).json({ error: 'Unauthorized: Invalid admin key' });
        }
        // Get current status so we know what to restore to when unarchiving
        const tRes = await db_1.db.execute({ sql: 'SELECT status, prev_status FROM tournaments WHERE id = ?', args: [id] });
        if (tRes.rows.length === 0)
            return res.status(404).json({ error: 'Tournament not found' });
        const current = tRes.rows[0];
        if (unarchive) {
            const restoreStatus = current.prev_status || 'in_progress';
            await db_1.db.execute({ sql: 'UPDATE tournaments SET status = ?, prev_status = NULL WHERE id = ?', args: [restoreStatus, id] });
        }
        else {
            await db_1.db.execute({ sql: "UPDATE tournaments SET prev_status = status, status = 'archived' WHERE id = ?", args: [id] });
        }
        res.json({ success: true });
    }
    catch (error) {
        console.error('Error archiving tournament:', error);
        res.status(500).json({ error: 'Database error' });
    }
});
// 8. Export tournament as full JSON backup
app.get('/api/tournaments/:id/export', async (req, res) => {
    const { id } = req.params;
    try {
        if (!(await verifyTournamentAdminKey(id, req))) {
            return res.status(403).json({ error: 'Unauthorized: Invalid admin key' });
        }
        const tResult = await db_1.db.execute({
            sql: 'SELECT id, name, type, status, created_at FROM tournaments WHERE id = ?',
            args: [id]
        });
        if (tResult.rows.length === 0)
            return res.status(404).json({ error: 'Tournament not found' });
        const pResult = await db_1.db.execute({
            sql: 'SELECT id, name, age FROM players WHERE tournament_id = ? ORDER BY name ASC',
            args: [id]
        });
        const rResult = await db_1.db.execute({
            sql: 'SELECT id, round_number, status FROM rounds WHERE tournament_id = ? ORDER BY round_number ASC',
            args: [id]
        });
        const mResult = await db_1.db.execute({
            sql: 'SELECT id, round_id, white_player_id, black_player_id, result FROM matches WHERE tournament_id = ? ORDER BY id ASC',
            args: [id]
        });
        const backup = {
            _version: 1,
            _exported_at: new Date().toISOString(),
            tournament: tResult.rows[0],
            players: pResult.rows,
            rounds: rResult.rows,
            matches: mResult.rows
        };
        res.setHeader('Content-Disposition', `attachment; filename="torneo-${tResult.rows[0].name.replace(/\s+/g, '_')}-backup.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(backup);
    }
    catch (error) {
        console.error('Error exporting tournament:', error);
        res.status(500).json({ error: 'Database error' });
    }
});
// 9. Restore tournament from JSON backup
app.post('/api/tournaments/restore', async (req, res) => {
    const { backup, adminKey } = req.body;
    if (!backup || !backup._version || !backup.tournament || !backup.players || !backup.rounds || !backup.matches) {
        return res.status(400).json({ error: 'Archivo de respaldo inválido o incompleto.' });
    }
    if (!adminKey || adminKey.trim() === '') {
        return res.status(400).json({ error: 'Se requiere una clave de administración para la restauración.' });
    }
    // Generate new IDs to avoid collisions
    const newTournamentId = (0, crypto_1.randomUUID)();
    const playerIdMap = new Map(); // oldId -> newId
    const roundIdMap = new Map(); // oldId -> newId
    try {
        // 1. Insert tournament
        const t = backup.tournament;
        await db_1.db.execute({
            sql: 'INSERT INTO tournaments (id, name, type, status, admin_key) VALUES (?, ?, ?, ?, ?)',
            args: [newTournamentId, t.name, t.type, t.status, adminKey.trim()]
        });
        // 2. Insert players with new IDs
        for (const p of backup.players) {
            const newPlayerId = (0, crypto_1.randomUUID)();
            playerIdMap.set(p.id, newPlayerId);
            await db_1.db.execute({
                sql: 'INSERT INTO players (id, tournament_id, name, age) VALUES (?, ?, ?, ?)',
                args: [newPlayerId, newTournamentId, p.name, p.age ?? null]
            });
        }
        // 3. Insert rounds with new IDs
        for (const r of backup.rounds) {
            const newRoundId = (0, crypto_1.randomUUID)();
            roundIdMap.set(r.id, newRoundId);
            await db_1.db.execute({
                sql: 'INSERT INTO rounds (id, tournament_id, round_number, status) VALUES (?, ?, ?, ?)',
                args: [newRoundId, newTournamentId, r.round_number, r.status]
            });
        }
        // 4. Insert matches with new IDs
        for (const m of backup.matches) {
            const newMatchId = (0, crypto_1.randomUUID)();
            const newRoundId = roundIdMap.get(m.round_id);
            const newWhiteId = playerIdMap.get(m.white_player_id);
            const isByeMatch = m.is_bye === 1 || m.black_player_id === 'BYE';
            const newBlackId = isByeMatch ? 'BYE' : playerIdMap.get(m.black_player_id);
            if (!newRoundId || !newWhiteId || !newBlackId) {
                // Orphan reference: skip silently (should not happen with valid backups)
                continue;
            }
            await db_1.db.execute({
                sql: 'INSERT INTO matches (id, tournament_id, round_id, white_player_id, black_player_id, result, is_bye) VALUES (?, ?, ?, ?, ?, ?, ?)',
                args: [newMatchId, newTournamentId, newRoundId, newWhiteId, newBlackId, m.result ?? null, isByeMatch ? 1 : 0]
            });
        }
        res.json({ id: newTournamentId, name: t.name });
    }
    catch (error) {
        console.error('Error restoring tournament:', error);
        // Attempt cleanup
        try {
            await db_1.db.execute({ sql: 'DELETE FROM tournaments WHERE id = ?', args: [newTournamentId] });
        }
        catch { }
        res.status(500).json({ error: 'Error al restaurar el torneo. Verifica que el archivo sea válido.' });
    }
});
// Fallback for SPA Routing in Production
if (process.env.NODE_ENV === 'production') {
    app.get('*', (req, res) => {
        res.sendFile(path_1.default.join(__dirname, '../dist/index.html'));
    });
}
// Startup migration: add new columns if they don't exist yet
async function runMigrations() {
    try {
        await db_1.db.execute('ALTER TABLE tournaments ADD COLUMN prev_status TEXT');
        console.log('Migration: added prev_status column to tournaments');
    }
    catch { }
    try {
        await db_1.db.execute('ALTER TABLE matches ADD COLUMN is_bye INTEGER DEFAULT 0');
        console.log('Migration: added is_bye column to matches');
    }
    catch { }
}
runMigrations().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});

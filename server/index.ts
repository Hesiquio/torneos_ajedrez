import express from 'express';
import cors from 'cors';
import path from 'path';
import { randomUUID } from 'crypto';
import { db } from './db';
import { generateNextRound, calculateSwissStandings } from './swiss';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

async function verifyTournamentAdminKey(tournamentId: string, req: express.Request): Promise<boolean> {
  const providedKey = req.headers['x-admin-key'] || req.body.adminKey;
  if (!providedKey) return false;
  try {
    const result = await db.execute({
      sql: 'SELECT admin_key FROM tournaments WHERE id = ?',
      args: [tournamentId]
    });
    if (result.rows.length === 0) return false;
    return result.rows[0].admin_key === providedKey;
  } catch (e) {
    return false;
  }
}

app.post('/api/tournaments/:id/verify-admin', async (req, res) => {
  const { id } = req.params;
  const isValid = await verifyTournamentAdminKey(id, req);
  if (!isValid) return res.status(403).json({ error: 'Clave incorrecta.' });
  res.json({ ok: true });
});

// ================= PLAYERS (GLOBAL) =================

app.get('/api/players', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM players ORDER BY grand_prix_points DESC, name ASC');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/players', async (req, res) => {
  const { name, age } = req.body;
  if (!name || name.trim() === '') return res.status(400).json({ error: 'Player name is required' });
  try {
    const id = randomUUID();
    await db.execute({
      sql: 'INSERT INTO players (id, name, age) VALUES (?, ?, ?)',
      args: [id, name.trim(), age ? parseInt(age) : null]
    });
    res.json({ id, name: name.trim(), age, grand_prix_points: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.put('/api/players/:id', async (req, res) => {
  const { id } = req.params;
  const { name, age } = req.body;
  if (!name || name.trim() === '') return res.status(400).json({ error: 'Player name is required' });
  try {
    await db.execute({
      sql: 'UPDATE players SET name = ?, age = ? WHERE id = ?',
      args: [name.trim(), age ? parseInt(age) : null, id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ================= TOURNAMENTS =================

app.get('/api/tournaments', async (req, res) => {
  try {
    const showArchived = req.query.archived === 'true';
    const sql = showArchived
      ? "SELECT id, name, status, total_rounds, created_at FROM tournaments WHERE status = 'archived' ORDER BY created_at DESC"
      : "SELECT id, name, status, total_rounds, created_at FROM tournaments WHERE status != 'archived' ORDER BY created_at DESC";
    const result = await db.execute(sql);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/tournaments', async (req, res) => {
  const { name, totalRounds, adminKey } = req.body;
  if (!name || !adminKey || adminKey.trim() === '') {
    return res.status(400).json({ error: 'Invalid name or admin key' });
  }
  const rounds = parseInt(totalRounds) || 5;
  const id = randomUUID();
  try {
    await db.execute({
      sql: 'INSERT INTO tournaments (id, name, status, total_rounds, admin_key) VALUES (?, ?, ?, ?, ?)',
      args: [id, name, 'created', rounds, adminKey.trim()]
    });
    res.json({ id, name, status: 'created', total_rounds: rounds });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/tournaments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const tResult = await db.execute({
      sql: 'SELECT id, name, status, total_rounds, created_at FROM tournaments WHERE id = ?',
      args: [id]
    });
    if (tResult.rows.length === 0) return res.status(404).json({ error: 'Tournament not found' });
    const tournament = tResult.rows[0];

    const pResult = await db.execute({
      sql: `SELECT p.* FROM players p 
            JOIN tournament_participants tp ON p.id = tp.player_id 
            WHERE tp.tournament_id = ? ORDER BY p.name ASC`,
      args: [id]
    });
    const players = pResult.rows;

    const rResult = await db.execute({
      sql: 'SELECT * FROM rounds WHERE tournament_id = ? ORDER BY round_number ASC',
      args: [id]
    });
    const rounds = rResult.rows;

    const mResult = await db.execute({
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

    const participants = players.map((p: any, index: number) => ({ id: p.id, seed: index + 1 }));
    const matchHistory = matches.map((m: any) => ({
      round: m.round_number,
      home: { id: m.white_player_id, points: m.result === '1-0' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 },
      away: { id: m.black_player_id, points: m.result === '0-1' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 }
    }));

    let standings: any[] = [];
    if (players.length > 0 && matchHistory.length > 0) {
      const swissStandings = calculateSwissStandings(rounds.length, participants, matchHistory);
      standings = swissStandings.map((s: any) => {
        const p = players.find((pl: any) => pl.id === s.id);
        return {
          id: s.id,
          name: p ? p.name : 'Unknown',
          points: s.wins,
          sb: s.tiebreaker,
          played: matches.filter((m:any) => (m.white_player_id === s.id || m.black_player_id === s.id) && m.result).length
        };
      });
    } else {
       standings = players.map((p: any) => ({ id: p.id, name: p.name, points: 0, sb: 0, played: 0 }));
    }

    res.json({ tournament, players, rounds, matches, standings });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/tournaments/:id/checkin', async (req, res) => {
  const { id } = req.params;
  const { playerIds } = req.body;
  try {
    if (!(await verifyTournamentAdminKey(id, req))) return res.status(403).json({ error: 'Unauthorized' });
    const tRes = await db.execute({ sql: 'SELECT status FROM tournaments WHERE id = ?', args: [id] });
    if (tRes.rows[0]?.status !== 'created') return res.status(400).json({ error: 'Cannot check-in after started' });

    await db.execute({ sql: 'DELETE FROM tournament_participants WHERE tournament_id = ?', args: [id] });
    for (const pid of playerIds) {
      await db.execute({ sql: 'INSERT INTO tournament_participants (tournament_id, player_id) VALUES (?, ?)', args: [id, pid] });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/tournaments/:id/start', async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await verifyTournamentAdminKey(id, req))) return res.status(403).json({ error: 'Unauthorized' });
    const tRes = await db.execute({ sql: 'SELECT status FROM tournaments WHERE id = ?', args: [id] });
    if (tRes.rows[0]?.status !== 'created') return res.status(400).json({ error: 'Already started' });

    await db.execute({ sql: "UPDATE tournaments SET status = 'in_progress' WHERE id = ?", args: [id] });

    const pResult = await db.execute({ sql: 'SELECT player_id FROM tournament_participants WHERE tournament_id = ?', args: [id] });
    const participants = pResult.rows.map((r: any, idx: number) => ({ id: r.player_id, seed: idx + 1 }));

    if (participants.length < 2) return res.status(400).json({ error: 'Need at least 2 players' });

    const roundId = randomUUID();
    await db.execute({ sql: 'INSERT INTO rounds (id, tournament_id, round_number, status) VALUES (?, ?, ?, ?)', args: [roundId, id, 1, 'pending'] });

    const matchups = generateNextRound(1, participants, []);
    for (const m of matchups) {
      await db.execute({
        sql: 'INSERT INTO matches (id, tournament_id, round_id, white_player_id, black_player_id, is_bye) VALUES (?, ?, ?, ?, ?, ?)',
        args: [randomUUID(), id, roundId, m.whitePlayerId, m.blackPlayerId, m.isBye ? 1 : 0]
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/tournaments/:id/next-round', async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await verifyTournamentAdminKey(id, req))) return res.status(403).json({ error: 'Unauthorized' });
    
    const rRes = await db.execute({ sql: 'SELECT * FROM rounds WHERE tournament_id = ? ORDER BY round_number DESC LIMIT 1', args: [id] });
    if (rRes.rows.length === 0) return res.status(400).json({ error: 'No active rounds' });
    const lastRound = rRes.rows[0] as any;
    if (lastRound.status !== 'completed') return res.status(400).json({ error: 'Current round is not completed yet' });

    const nextRoundNumber = lastRound.round_number + 1;

    const mRes = await db.execute({ sql: 'SELECT m.*, r.round_number FROM matches m JOIN rounds r ON m.round_id = r.id WHERE m.tournament_id = ?', args: [id] });
    const matchHistory = mRes.rows.map((m: any) => ({
      round: m.round_number,
      home: { id: m.white_player_id, points: m.result === '1-0' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 },
      away: { id: m.black_player_id, points: m.result === '0-1' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 }
    }));

    const pResult = await db.execute({ sql: 'SELECT player_id FROM tournament_participants WHERE tournament_id = ?', args: [id] });
    const participants = pResult.rows.map((r: any, idx: number) => ({ id: r.player_id, seed: idx + 1 }));

    const roundId = randomUUID();
    await db.execute({ sql: 'INSERT INTO rounds (id, tournament_id, round_number, status) VALUES (?, ?, ?, ?)', args: [roundId, id, nextRoundNumber, 'pending'] });

    const matchups = generateNextRound(nextRoundNumber, participants, matchHistory);
    for (const m of matchups) {
      await db.execute({
        sql: 'INSERT INTO matches (id, tournament_id, round_id, white_player_id, black_player_id, is_bye) VALUES (?, ?, ?, ?, ?, ?)',
        args: [randomUUID(), id, roundId, m.whitePlayerId, m.blackPlayerId, m.isBye ? 1 : 0]
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/matches/:id/result', async (req, res) => {
  const { id } = req.params;
  const { result } = req.body;
  try {
    const mRes = await db.execute({ sql: 'SELECT tournament_id, round_id FROM matches WHERE id = ?', args: [id] });
    if (mRes.rows.length === 0) return res.status(404).json({ error: 'Match not found' });
    const tournamentId = (mRes.rows[0] as any).tournament_id;
    const roundId = (mRes.rows[0] as any).round_id;

    if (!(await verifyTournamentAdminKey(tournamentId, req))) return res.status(403).json({ error: 'Unauthorized' });

    await db.execute({ sql: 'UPDATE matches SET result = ? WHERE id = ?', args: [result, id] });

    const roundMatchesRes = await db.execute({
      sql: 'SELECT COUNT(*) as total, SUM(CASE WHEN result IS NOT NULL THEN 1 ELSE 0 END) as completed FROM matches WHERE round_id = ? AND is_bye = 0',
      args: [roundId]
    });
    const roundStats = roundMatchesRes.rows[0] as any;
    if (roundStats.total === roundStats.completed) {
      await db.execute({ sql: "UPDATE rounds SET status = 'completed' WHERE id = ?", args: [roundId] });
    } else {
      await db.execute({ sql: "UPDATE rounds SET status = 'pending' WHERE id = ?", args: [roundId] });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/tournaments/:id/complete', async (req, res) => {
  const { id } = req.params;
  try {
    if (!(await verifyTournamentAdminKey(id, req))) return res.status(403).json({ error: 'Unauthorized' });

    await db.execute({ sql: "UPDATE tournaments SET status = 'completed' WHERE id = ?", args: [id] });

    const pResult = await db.execute({ sql: 'SELECT player_id FROM tournament_participants WHERE tournament_id = ?', args: [id] });
    const participants = pResult.rows.map((r: any, idx: number) => ({ id: r.player_id, seed: idx + 1 }));

    const rResult = await db.execute({ sql: 'SELECT * FROM rounds WHERE tournament_id = ?', args: [id] });
    const mRes = await db.execute({ sql: 'SELECT m.*, r.round_number FROM matches m JOIN rounds r ON m.round_id = r.id WHERE m.tournament_id = ?', args: [id] });
    const matchHistory = mRes.rows.map((m: any) => ({
      round: m.round_number,
      home: { id: m.white_player_id, points: m.result === '1-0' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 },
      away: { id: m.black_player_id, points: m.result === '0-1' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 }
    }));

    const swissStandings = calculateSwissStandings(rResult.rows.length, participants, matchHistory);
    
    const gpPointsMap = [10, 8, 6, 4, 2];

    for (let i = 0; i < swissStandings.length; i++) {
      const pid = swissStandings[i].id;
      const pointsToAward = i < gpPointsMap.length ? gpPointsMap[i] : 1;
      
      await db.execute({
        sql: 'UPDATE players SET grand_prix_points = grand_prix_points + ? WHERE id = ?',
        args: [pointsToAward, pid]
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/tournaments/:id', async (req, res) => {
  const { id } = req.params;
  if (!(await verifyTournamentAdminKey(id, req))) return res.status(403).json({ error: 'Unauthorized' });
  await db.execute({ sql: 'DELETE FROM tournaments WHERE id = ?', args: [id] });
  res.json({ success: true });
});

app.patch('/api/tournaments/:id/archive', async (req, res) => {
  const { id } = req.params;
  if (!(await verifyTournamentAdminKey(id, req))) return res.status(403).json({ error: 'Unauthorized' });
  const { unarchive } = req.body;
  if (unarchive) {
    await db.execute({ sql: "UPDATE tournaments SET status = 'completed' WHERE id = ?", args: [id] });
  } else {
    await db.execute({ sql: "UPDATE tournaments SET status = 'archived' WHERE id = ?", args: [id] });
  }
  res.json({ success: true });
});

if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

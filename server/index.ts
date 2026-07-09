import express from 'express';
import cors from 'cors';
import path from 'path';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { db } from './db';
import { generateNextRound, calculateSwissStandings } from './swiss';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-chess-key';

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../dist')));
}

// ================= AUTHENTICATION & MIDDLEWARE =================

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan credenciales' });

  try {
    const result = await db.execute({
      sql: 'SELECT id, username, password_hash, role, club_id FROM users WHERE username = ?',
      args: [username]
    });

    if (result.rows.length === 0) return res.status(401).json({ error: 'Credenciales inválidas' });
    
    const user = result.rows[0] as any;
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = jwt.sign({ id: user.id, role: user.role, clubId: user.club_id }, JWT_SECRET, { expiresIn: '12h' });
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, clubId: user.club_id } });
  } catch(e) {
    res.status(500).json({ error: 'Database error' });
  }
});

function verifyGlobalAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No autorizado' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch(e) {
    res.status(401).json({ error: 'Token inválido' });
  }
}

async function verifyTournamentAdminKey(tournamentId: string, req: express.Request): Promise<boolean> {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      if (decoded.role === 'SUPER_ADMIN') return true;
      if (decoded.role === 'CLUB_ADMIN') {
        const tResult = await db.execute({ sql: 'SELECT club_id FROM tournaments WHERE id = ?', args: [tournamentId] });
        if (tResult.rows.length > 0 && tResult.rows[0].club_id === decoded.clubId) return true;
      }
    } catch(e) {}
  }

  const providedKey = req.headers['x-admin-key'] || req.body.adminKey;
  if (!providedKey) return false;
  try {
    const result = await db.execute({ sql: 'SELECT admin_key FROM tournaments WHERE id = ?', args: [tournamentId] });
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

// --- Clubs API ---
app.get('/api/clubs', async (req, res) => {
  try {
    const rs = await db.execute('SELECT * FROM clubs ORDER BY created_at DESC');
    res.json(rs.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/clubs', verifyGlobalAdmin, async (req, res) => {
  try {
    const rs = await db.execute('SELECT * FROM clubs ORDER BY created_at DESC');
    res.json(rs.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/clubs', verifyGlobalAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const id = randomUUID();
    await db.execute({
      sql: 'INSERT INTO clubs (id, name) VALUES (?, ?)',
      args: [id, name]
    });
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/clubs/:id', verifyGlobalAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    await db.execute({
      sql: 'UPDATE clubs SET name = ? WHERE id = ?',
      args: [name, req.params.id]
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/clubs/:id', verifyGlobalAdmin, async (req, res) => {
  try {
    // Delete players (this also avoids orphan players)
    await db.execute({
      sql: 'DELETE FROM players WHERE club_id = ?',
      args: [req.params.id]
    });
    // Delete tournaments (which will theoretically leave orphan matches/rounds, so we delete those too)
    const tRes = await db.execute({
      sql: 'SELECT id FROM tournaments WHERE club_id = ?',
      args: [req.params.id]
    });
    for (const row of tRes.rows) {
      await db.execute({ sql: 'DELETE FROM matches WHERE tournament_id = ?', args: [row.id] });
      await db.execute({ sql: 'DELETE FROM rounds WHERE tournament_id = ?', args: [row.id] });
      await db.execute({ sql: 'DELETE FROM tournament_players WHERE tournament_id = ?', args: [row.id] });
      await db.execute({ sql: 'DELETE FROM standings WHERE tournament_id = ?', args: [row.id] });
    }
    await db.execute({
      sql: 'DELETE FROM tournaments WHERE club_id = ?',
      args: [req.params.id]
    });
    
    // Delete the club itself
    await db.execute({
      sql: 'DELETE FROM clubs WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/clubs/:id/history', async (req, res) => {
  try {
    const rs = await db.execute({
      sql: `SELECT m.id, m.result, m.is_bye,
            t.name as tournament_name, t.created_at as tournament_date,
            r.round_number,
            w.name as white_player_name, b.name as black_player_name
            FROM matches m
            JOIN tournaments t ON m.tournament_id = t.id
            JOIN rounds r ON m.round_id = r.id
            JOIN players w ON m.white_player_id = w.id
            LEFT JOIN players b ON m.black_player_id = b.id
            WHERE t.club_id = ? AND m.result IS NOT NULL AND m.is_bye = 0
            ORDER BY t.created_at DESC, r.round_number ASC, m.id ASC
            LIMIT 50`,
      args: [req.params.id]
    });
    res.json(rs.rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ================= PLAYERS =================

app.get('/api/players', async (req, res) => {
  try {
    const clubId = req.query.club_id;
    // include_hidden=true is only used by admin endpoints
    const includeHidden = req.query.include_hidden === 'true';
    const hiddenFilter = includeHidden ? '' : 'AND (hidden IS NULL OR hidden = 0)';

    let sql = `SELECT * FROM players WHERE club_id IS NULL ${hiddenFilter} ORDER BY grand_prix_points DESC, name ASC`;
    let args: any[] = [];
    if (clubId && clubId !== 'null') {
      sql = `SELECT * FROM players WHERE club_id = ? ${hiddenFilter} ORDER BY grand_prix_points DESC, name ASC`;
      args = [clubId];
    }
    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/players', async (req, res) => {
  const { name, age, clubId } = req.body;
  if (!name || name.trim() === '') return res.status(400).json({ error: 'Player name is required' });
  try {
    const id = randomUUID();
    await db.execute({
      sql: 'INSERT INTO players (id, club_id, name, age) VALUES (?, ?, ?, ?)',
      args: [id, clubId || null, name.trim(), age ? parseInt(age) : null]
    });
    res.json({ id, club_id: clubId || null, name: name.trim(), age, grand_prix_points: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

  app.put('/api/players/:id', verifyGlobalAdmin, async (req, res) => {
  const { id } = req.params;
  const { name, age, grand_prix_points } = req.body;
  if (!name || name.trim() === '') return res.status(400).json({ error: 'Player name is required' });
  try {
    const pResult = await db.execute({ sql: 'SELECT club_id FROM players WHERE id = ?', args: [id] });
    if (pResult.rows.length === 0) return res.status(404).json({ error: 'Player not found' });
    
    const user = (req as any).user;
    if (user.role === 'CLUB_ADMIN' && pResult.rows[0].club_id !== user.clubId) {
       return res.status(403).json({ error: 'Forbidden' });
    }

    await db.execute({
      sql: 'UPDATE players SET name = ?, age = ?, grand_prix_points = ? WHERE id = ?',
      args: [name.trim(), age ? parseInt(age) : null, grand_prix_points !== undefined ? parseFloat(grand_prix_points) : 0, id]
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Toggle player visibility (admin only)
app.patch('/api/players/:id/visibility', verifyGlobalAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const pResult = await db.execute({ sql: 'SELECT club_id, hidden FROM players WHERE id = ?', args: [id] });
    if (pResult.rows.length === 0) return res.status(404).json({ error: 'Player not found' });
    const user = (req as any).user;
    if (user.role === 'CLUB_ADMIN' && pResult.rows[0].club_id !== user.clubId) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const currentlyHidden = pResult.rows[0].hidden === 1;
    await db.execute({
      sql: 'UPDATE players SET hidden = ? WHERE id = ?',
      args: [currentlyHidden ? 0 : 1, id]
    });
    res.json({ hidden: !currentlyHidden });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/players/:id', verifyGlobalAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    const pResult = await db.execute({ sql: 'SELECT club_id FROM players WHERE id = ?', args: [id] });
    if (pResult.rows.length === 0) return res.status(404).json({ error: 'Player not found' });
    
    const user = (req as any).user;
    if (user.role === 'CLUB_ADMIN' && pResult.rows[0].club_id !== user.clubId) {
       return res.status(403).json({ error: 'Forbidden' });
    }
    await db.execute({ sql: 'DELETE FROM players WHERE id = ?', args: [id] });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

// ================= TOURNAMENTS =================

app.get('/api/tournaments', async (req, res) => {
  try {
    const clubId = req.query.club_id;
    const showArchived = req.query.archived === 'true';
    
    let sql = '';
    let args: any[] = [];

    if (clubId && clubId !== 'null') {
      sql = showArchived
        ? "SELECT id, name, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE club_id = ? AND status = 'archived' ORDER BY created_at DESC"
        : "SELECT id, name, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE club_id = ? AND status != 'archived' ORDER BY created_at DESC";
      args = [clubId];
    } else {
      sql = showArchived
        ? "SELECT id, name, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE club_id IS NULL AND status = 'archived' ORDER BY created_at DESC"
        : "SELECT id, name, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE club_id IS NULL AND status != 'archived' ORDER BY created_at DESC";
    }

    const result = await db.execute({ sql, args });
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/tournaments', async (req, res) => {
  const { name, totalRounds, adminKey, clubId, isGrandPrix } = req.body;
  if (!name || !adminKey || adminKey.trim() === '') {
    return res.status(400).json({ error: 'Invalid name or admin key' });
  }
  const rounds = parseInt(totalRounds) || 5;
  const id = randomUUID();
  const grandPrix = isGrandPrix === undefined ? 1 : (isGrandPrix ? 1 : 0);
  try {
    await db.execute({
      sql: 'INSERT INTO tournaments (id, club_id, name, status, total_rounds, is_grand_prix, admin_key) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, clubId || null, name, 'created', rounds, grandPrix, adminKey.trim()]
    });
    res.json({ id, name, status: 'created', total_rounds: rounds, is_grand_prix: grandPrix, club_id: clubId || null });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.get('/api/tournaments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const tResult = await db.execute({
      sql: 'SELECT id, club_id, name, status, total_rounds, is_grand_prix, created_at FROM tournaments WHERE id = ?',
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
    const matchHistory = matches
      .filter((m: any) => m.result !== null)
      .map((m: any) => ({
        round: m.round_number,
        home: { id: m.white_player_id, points: m.result === '1-0' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 },
        away: { id: m.black_player_id, points: m.result === '0-1' ? 1 : m.result === '0.5-0.5' ? 0.5 : 0 }
      }));

    // --- Calculate standings directly (accurate regardless of library quirks) ---
    const pointsMap = new Map<string, number>();
    const opponentsMap = new Map<string, string[]>(); // player -> list of opponent ids

    for (const p of players) {
      pointsMap.set(p.id as string, 0);
      opponentsMap.set(p.id as string, []);
    }

    for (const m of matches) {
      if (!m.result || m.is_bye === 1) continue;
      const wid = m.white_player_id as string;
      const bid = m.black_player_id as string;
      if (m.result === '1-0') {
        pointsMap.set(wid, (pointsMap.get(wid) || 0) + 1);
      } else if (m.result === '0-1') {
        pointsMap.set(bid, (pointsMap.get(bid) || 0) + 1);
      } else if (m.result === '0.5-0.5') {
        pointsMap.set(wid, (pointsMap.get(wid) || 0) + 0.5);
        pointsMap.set(bid, (pointsMap.get(bid) || 0) + 0.5);
      }
      opponentsMap.get(wid)?.push(bid);
      opponentsMap.get(bid)?.push(wid);
    }

    // Buchholz tiebreaker: sum of opponents' points
    const standings = players.map((p: any) => {
      const pid = p.id as string;
      const pts = pointsMap.get(pid) || 0;
      const buchholz = (opponentsMap.get(pid) || []).reduce((sum, oppId) => sum + (pointsMap.get(oppId) || 0), 0);
      return { id: pid, name: p.name, points: pts, sb: Math.round(buchholz * 10) / 10, played: (opponentsMap.get(pid) || []).length };
    }).sort((a, b) => b.points - a.points || b.sb - a.sb);

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

    const tRes = await db.execute({ sql: 'SELECT * FROM tournaments WHERE id = ?', args: [id] });
    const tournament = tRes.rows[0] as any;

    await db.execute({ sql: "UPDATE tournaments SET status = 'completed' WHERE id = ?", args: [id] });

    const pResult = await db.execute({
      sql: `SELECT p.id FROM players p JOIN tournament_participants tp ON p.id = tp.player_id WHERE tp.tournament_id = ?`,
      args: [id]
    });
    const playerIds = pResult.rows.map((r: any) => r.id as string);

    const mRes = await db.execute({
      sql: 'SELECT white_player_id, black_player_id, result, is_bye FROM matches WHERE tournament_id = ?',
      args: [id]
    });

    // Direct standings calculation (same as GET /tournaments/:id)
    const pointsMap = new Map<string, number>();
    const opponentsMap = new Map<string, string[]>();
    for (const pid of playerIds) { pointsMap.set(pid, 0); opponentsMap.set(pid, []); }

    for (const m of mRes.rows) {
      if (!m.result || m.is_bye === 1) continue;
      const wid = m.white_player_id as string;
      const bid = m.black_player_id as string;
      if (m.result === '1-0') pointsMap.set(wid, (pointsMap.get(wid) || 0) + 1);
      else if (m.result === '0-1') pointsMap.set(bid, (pointsMap.get(bid) || 0) + 1);
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
      const gpParticipation = 2;             // 6th onwards
      for (let i = 0; i < sortedStandings.length; i++) {
        const pointsToAward = i < gpPointsMap.length ? gpPointsMap[i] : gpParticipation;
        await db.execute({
          sql: 'UPDATE players SET grand_prix_points = grand_prix_points + ? WHERE id = ?',
          args: [pointsToAward, sortedStandings[i].id]
        });
      }
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

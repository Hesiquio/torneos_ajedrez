import swissPairing from 'swiss-pairing';

// Create a configured instance of the swiss pairing engine
// We use maxPointsPerRound = 1 (standard chess points)
const engine = swissPairing({
  maxPointsPerRound: 1,
  rematchWeight: 100,
  standingPower: 2,
  seedMultiplier: 6781
});

export interface Participant {
  id: string;
  seed: number;
}

export interface MatchHistory {
  round: number;
  home: {
    id: string;
    points: number; // 1 for win, 0.5 for draw, 0 for loss
  };
  away: {
    id: string; // If it's a bye, we should handle it appropriately. swiss-pairing uses null for byes? 
    points: number;
  };
}

export function generateNextRound(roundNumber: number, participants: Participant[], matchHistory: MatchHistory[]) {
  // swiss-pairing expects participants with an 'id' and 'seed'
  // It expects matches in a specific format
  const matchups = engine.getMatchups(roundNumber, participants, matchHistory);
  
  // matchups is an array of { home: id, away: id } (away is null if it's a bye)
  return matchups.map((m: any) => ({
    whitePlayerId: m.home,
    blackPlayerId: m.away || 'BYE',
    isBye: !m.away
  }));
}

export function calculateSwissStandings(roundNumber: number, participants: Participant[], matchHistory: MatchHistory[]) {
  const standings = engine.getStandings(roundNumber, participants, matchHistory);
  return standings;
}

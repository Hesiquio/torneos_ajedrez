import { randomUUID } from 'crypto';

interface Player {
  id: string;
  name: string;
}

interface Match {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
}

interface Round {
  roundNumber: number;
  matches: Match[];
}

/**
 * Generates a standard Round Robin fixture using the Circle Method (Berger System).
 */
export function generateRoundRobin(players: Player[], doubleRound: boolean): Round[] {
  const list = [...players];
  if (list.length % 2 !== 0) {
    // Add a dummy player for "bye"
    list.push({ id: 'BYE', name: 'Descanso' });
  }

  const numPlayers = list.length;
  const numRounds = numPlayers - 1;
  const rounds: Round[] = [];

  for (let r = 0; r < numRounds; r++) {
    const matches: Match[] = [];
    for (let i = 0; i < numPlayers / 2; i++) {
      const player1 = list[i];
      const player2 = list[numPlayers - 1 - i];

      // Skip match if it is against BYE
      if (player1.id === 'BYE' || player2.id === 'BYE') {
        continue;
      }

      // Alternate colors to balance White/Black
      if ((r + i) % 2 === 0) {
        matches.push({
          id: randomUUID(),
          whitePlayerId: player1.id,
          blackPlayerId: player2.id,
        });
      } else {
        matches.push({
          id: randomUUID(),
          whitePlayerId: player2.id,
          blackPlayerId: player1.id,
        });
      }
    }

    rounds.push({
      roundNumber: r + 1,
      matches,
    });

    // Rotate players (keep the first one fixed)
    list.splice(1, 0, list.pop()!);
  }

  if (doubleRound) {
    // Create double round robin by reversing the colors of the first round robin
    const doubleRounds: Round[] = [];
    
    // Add first round robin
    doubleRounds.push(...rounds);

    // Add second round robin with inverted colors
    rounds.forEach((round) => {
      const reversedMatches = round.matches.map((match) => ({
        id: randomUUID(),
        whitePlayerId: match.blackPlayerId,
        blackPlayerId: match.whitePlayerId,
      }));
      doubleRounds.push({
        roundNumber: round.roundNumber + numRounds,
        matches: reversedMatches,
      });
    });

    return doubleRounds;
  }

  return rounds;
}

/**
 * Generates the necessary new matches when a player is added to an active tournament.
 * Existing matches and rounds are kept.
 * The new matches are grouped into new round numbers.
 */
export function generateCatchUpMatches(
  newPlayerId: string,
  existingPlayerIds: string[],
  doubleRound: boolean,
  startRoundNumber: number
): Round[] {
  const newMatches: Match[] = [];

  // Create matches against all existing players
  existingPlayerIds.forEach((existingId, index) => {
    if (doubleRound) {
      // One match as white, one as black
      newMatches.push({
        id: randomUUID(),
        whitePlayerId: newPlayerId,
        blackPlayerId: existingId,
      });
      newMatches.push({
        id: randomUUID(),
        whitePlayerId: existingId,
        blackPlayerId: newPlayerId,
      });
    } else {
      // Single matchup: alternate who plays white based on index to balance colors
      if (index % 2 === 0) {
        newMatches.push({
          id: randomUUID(),
          whitePlayerId: newPlayerId,
          blackPlayerId: existingId,
        });
      } else {
        newMatches.push({
          id: randomUUID(),
          whitePlayerId: existingId,
          blackPlayerId: newPlayerId,
        });
      }
    }
  });

  // Group these matches into new rounds.
  // To avoid having a player play multiple games in the same round, we can distribute them.
  // However, since the new player is playing against everyone, the new player HAS to play them sequentially.
  // So we can create one round per oponente (or oponente pair) for the new player.
  // Let's create one round per opponent (each containing the match(es) against that opponent).
  const rounds: Round[] = [];
  let currentRoundNum = startRoundNumber;

  if (doubleRound) {
    // 2 games per opponent
    for (let i = 0; i < newMatches.length; i += 2) {
      rounds.push({
        roundNumber: currentRoundNum++,
        matches: [newMatches[i], newMatches[i + 1]],
      });
    }
  } else {
    // 1 game per opponent
    for (let i = 0; i < newMatches.length; i++) {
      rounds.push({
        roundNumber: currentRoundNum++,
        matches: [newMatches[i]],
      });
    }
  }

  return rounds;
}

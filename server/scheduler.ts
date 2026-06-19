import { randomUUID } from 'crypto';

interface Player {
  id: string;
  name: string;
}

interface Match {
  id: string;
  whitePlayerId: string;
  blackPlayerId: string;
  isBye?: boolean;
}

interface Round {
  roundNumber: number;
  matches: Match[];
}

/**
 * Generates a standard Round Robin fixture using the Circle Method (Berger System).
 * When player count is odd, a BYE player (id='BYE') is added.
 * Bye matches are included as real match records (blackPlayerId='BYE', isBye=true)
 * so the resting player is visible in the UI.
 */
export function generateRoundRobin(players: Player[], doubleRound: boolean): Round[] {
  const list = [...players];
  const hasBye = list.length % 2 !== 0;
  if (hasBye) {
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

      if (player1.id === 'BYE') {
        // player2 has a bye this round
        matches.push({ id: randomUUID(), whitePlayerId: player2.id, blackPlayerId: 'BYE', isBye: true });
        continue;
      }
      if (player2.id === 'BYE') {
        // player1 has a bye this round
        matches.push({ id: randomUUID(), whitePlayerId: player1.id, blackPlayerId: 'BYE', isBye: true });
        continue;
      }

      // FIDE Berger system color alternation rule:
      // The fixed player (index 0) alternates every round (White on even rounds).
      // For all other pairs, the player at the odd index 'i' gets White,
      // and if 'i' is even, the player at the other end gets White.
      if (i === 0) {
        if (r % 2 === 0) {
          matches.push({ id: randomUUID(), whitePlayerId: player1.id, blackPlayerId: player2.id });
        } else {
          matches.push({ id: randomUUID(), whitePlayerId: player2.id, blackPlayerId: player1.id });
        }
      } else {
        if (i % 2 === 1) {
          matches.push({ id: randomUUID(), whitePlayerId: player1.id, blackPlayerId: player2.id });
        } else {
          matches.push({ id: randomUUID(), whitePlayerId: player2.id, blackPlayerId: player1.id });
        }
      }
    }

    rounds.push({ roundNumber: r + 1, matches });

    // Rotate players (keep the first one fixed)
    list.splice(1, 0, list.pop()!);
  }

  if (doubleRound) {
    const doubleRounds: Round[] = [...rounds];
    rounds.forEach((round) => {
      const reversedMatches = round.matches.map((match) => {
        if (match.isBye) {
          // Bye stays the same in second leg
          return { id: randomUUID(), whitePlayerId: match.whitePlayerId, blackPlayerId: 'BYE', isBye: true };
        }
        return {
          id: randomUUID(),
          whitePlayerId: match.blackPlayerId,
          blackPlayerId: match.whitePlayerId,
        };
      });
      doubleRounds.push({ roundNumber: round.roundNumber + numRounds, matches: reversedMatches });
    });
    return doubleRounds;
  }

  return rounds;
}

/**
 * Fills existing rounds with matches for a newly added player and only creates
 * new rounds when no existing slot is available.
 *
 * @param newPlayerId       ID of the newly inserted player
 * @param existingPlayerIds IDs of all previously registered players (excluding newPlayer)
 * @param doubleRound       true = ida y vuelta
 * @param existingRounds    Current rounds in DB: [{id, roundNumber, busyPlayerIds}]
 * @param nextRoundNumber   Next round number to use when a new round must be created
 */
export function assignMidTournamentMatches(
  newPlayerId: string,
  existingPlayerIds: string[],
  doubleRound: boolean,
  existingRounds: { id: string; roundNumber: number; busyPlayerIds: Set<string> }[],
  nextRoundNumber: number
): {
  roundAssignments: { roundId: string; whitePlayerId: string; blackPlayerId: string; isBye: boolean }[];
  newRoundsNeeded: { id: string; roundNumber: number }[];
} {
  // Work on a mutable copy of the schedule
  const schedule = existingRounds.map(r => ({ ...r, busyPlayerIds: new Set(r.busyPlayerIds) }));
  let nextNum = nextRoundNumber;

  const roundAssignments: { roundId: string; whitePlayerId: string; blackPlayerId: string; isBye: boolean }[] = [];
  const newRoundsNeeded: { id: string; roundNumber: number }[] = [];

  // Helper: find the first round where both players are free, or create a new one
  const findOrCreateRound = (playerA: string, playerB: string): string => {
    for (const slot of schedule) {
      if (!slot.busyPlayerIds.has(playerA) && !slot.busyPlayerIds.has(playerB)) {
        slot.busyPlayerIds.add(playerA);
        slot.busyPlayerIds.add(playerB);
        return slot.id;
      }
    }
    // No existing round available — create a new one
    const newId = randomUUID();
    const newSlot = { id: newId, roundNumber: nextNum++, busyPlayerIds: new Set([playerA, playerB]) };
    schedule.push(newSlot);
    newRoundsNeeded.push({ id: newId, roundNumber: newSlot.roundNumber });
    return newId;
  };

  existingPlayerIds.forEach((opponentId, index) => {
    if (doubleRound) {
      // Match 1: newPlayer as white
      const roundId1 = findOrCreateRound(newPlayerId, opponentId);
      roundAssignments.push({ roundId: roundId1, whitePlayerId: newPlayerId, blackPlayerId: opponentId, isBye: false });

      // Match 2: opponent as white (return leg)
      const roundId2 = findOrCreateRound(newPlayerId, opponentId);
      roundAssignments.push({ roundId: roundId2, whitePlayerId: opponentId, blackPlayerId: newPlayerId, isBye: false });
    } else {
      // Alternate colors for balance
      const [white, black] = index % 2 === 0
        ? [newPlayerId, opponentId]
        : [opponentId, newPlayerId];
      const roundId = findOrCreateRound(newPlayerId, opponentId);
      roundAssignments.push({ roundId, whitePlayerId: white, blackPlayerId: black, isBye: false });
    }
  });

  return { roundAssignments, newRoundsNeeded };
}

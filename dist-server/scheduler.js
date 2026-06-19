"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoundRobin = generateRoundRobin;
exports.assignMidTournamentMatches = assignMidTournamentMatches;
const crypto_1 = require("crypto");
/**
 * Generates a standard Round Robin fixture using the Circle Method (Berger System).
 * When player count is odd, a BYE player (id='BYE') is added.
 * Bye matches are included as real match records (blackPlayerId='BYE', isBye=true)
 * so the resting player is visible in the UI.
 */
function generateRoundRobin(players, doubleRound) {
    const list = [...players];
    const hasBye = list.length % 2 !== 0;
    if (hasBye) {
        list.push({ id: 'BYE', name: 'Descanso' });
    }
    const numPlayers = list.length;
    const numRounds = numPlayers - 1;
    const rounds = [];
    for (let r = 0; r < numRounds; r++) {
        const matches = [];
        for (let i = 0; i < numPlayers / 2; i++) {
            const player1 = list[i];
            const player2 = list[numPlayers - 1 - i];
            if (player1.id === 'BYE') {
                // player2 has a bye this round
                matches.push({ id: (0, crypto_1.randomUUID)(), whitePlayerId: player2.id, blackPlayerId: 'BYE', isBye: true });
                continue;
            }
            if (player2.id === 'BYE') {
                // player1 has a bye this round
                matches.push({ id: (0, crypto_1.randomUUID)(), whitePlayerId: player1.id, blackPlayerId: 'BYE', isBye: true });
                continue;
            }
            // Alternate colors to balance White/Black
            if ((r + i) % 2 === 0) {
                matches.push({ id: (0, crypto_1.randomUUID)(), whitePlayerId: player1.id, blackPlayerId: player2.id });
            }
            else {
                matches.push({ id: (0, crypto_1.randomUUID)(), whitePlayerId: player2.id, blackPlayerId: player1.id });
            }
        }
        rounds.push({ roundNumber: r + 1, matches });
        // Rotate players (keep the first one fixed)
        list.splice(1, 0, list.pop());
    }
    if (doubleRound) {
        const doubleRounds = [...rounds];
        rounds.forEach((round) => {
            const reversedMatches = round.matches.map((match) => {
                if (match.isBye) {
                    // Bye stays the same in second leg
                    return { id: (0, crypto_1.randomUUID)(), whitePlayerId: match.whitePlayerId, blackPlayerId: 'BYE', isBye: true };
                }
                return {
                    id: (0, crypto_1.randomUUID)(),
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
function assignMidTournamentMatches(newPlayerId, existingPlayerIds, doubleRound, existingRounds, nextRoundNumber) {
    // Work on a mutable copy of the schedule
    const schedule = existingRounds.map(r => ({ ...r, busyPlayerIds: new Set(r.busyPlayerIds) }));
    let nextNum = nextRoundNumber;
    const roundAssignments = [];
    const newRoundsNeeded = [];
    // Helper: find the first round where both players are free, or create a new one
    const findOrCreateRound = (playerA, playerB) => {
        for (const slot of schedule) {
            if (!slot.busyPlayerIds.has(playerA) && !slot.busyPlayerIds.has(playerB)) {
                slot.busyPlayerIds.add(playerA);
                slot.busyPlayerIds.add(playerB);
                return slot.id;
            }
        }
        // No existing round available — create a new one
        const newId = (0, crypto_1.randomUUID)();
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
        }
        else {
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

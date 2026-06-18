"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoundRobin = generateRoundRobin;
exports.generateCatchUpMatches = generateCatchUpMatches;
const crypto_1 = require("crypto");
/**
 * Generates a standard Round Robin fixture using the Circle Method (Berger System).
 */
function generateRoundRobin(players, doubleRound) {
    const list = [...players];
    if (list.length % 2 !== 0) {
        // Add a dummy player for "bye"
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
            // Skip match if it is against BYE
            if (player1.id === 'BYE' || player2.id === 'BYE') {
                continue;
            }
            // Alternate colors to balance White/Black
            if ((r + i) % 2 === 0) {
                matches.push({
                    id: (0, crypto_1.randomUUID)(),
                    whitePlayerId: player1.id,
                    blackPlayerId: player2.id,
                });
            }
            else {
                matches.push({
                    id: (0, crypto_1.randomUUID)(),
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
        list.splice(1, 0, list.pop());
    }
    if (doubleRound) {
        // Create double round robin by reversing the colors of the first round robin
        const doubleRounds = [];
        // Add first round robin
        doubleRounds.push(...rounds);
        // Add second round robin with inverted colors
        rounds.forEach((round) => {
            const reversedMatches = round.matches.map((match) => ({
                id: (0, crypto_1.randomUUID)(),
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
function generateCatchUpMatches(newPlayerId, existingPlayerIds, doubleRound, startRoundNumber) {
    const newMatches = [];
    // Create matches against all existing players
    existingPlayerIds.forEach((existingId, index) => {
        if (doubleRound) {
            // One match as white, one as black
            newMatches.push({
                id: (0, crypto_1.randomUUID)(),
                whitePlayerId: newPlayerId,
                blackPlayerId: existingId,
            });
            newMatches.push({
                id: (0, crypto_1.randomUUID)(),
                whitePlayerId: existingId,
                blackPlayerId: newPlayerId,
            });
        }
        else {
            // Single matchup: alternate who plays white based on index to balance colors
            if (index % 2 === 0) {
                newMatches.push({
                    id: (0, crypto_1.randomUUID)(),
                    whitePlayerId: newPlayerId,
                    blackPlayerId: existingId,
                });
            }
            else {
                newMatches.push({
                    id: (0, crypto_1.randomUUID)(),
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
    const rounds = [];
    let currentRoundNum = startRoundNumber;
    if (doubleRound) {
        // 2 games per opponent
        for (let i = 0; i < newMatches.length; i += 2) {
            rounds.push({
                roundNumber: currentRoundNum++,
                matches: [newMatches[i], newMatches[i + 1]],
            });
        }
    }
    else {
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

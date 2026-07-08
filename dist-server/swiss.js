"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNextRound = generateNextRound;
exports.calculateSwissStandings = calculateSwissStandings;
const swiss_pairing_1 = __importDefault(require("swiss-pairing"));
// Create a configured instance of the swiss pairing engine
// We use maxPointsPerRound = 1 (standard chess points)
const engine = (0, swiss_pairing_1.default)({
    maxPointsPerRound: 1,
    rematchWeight: 100,
    standingPower: 2,
    seedMultiplier: 6781
});
function generateNextRound(roundNumber, participants, matchHistory) {
    // swiss-pairing expects participants with an 'id' and 'seed'
    // It expects matches in a specific format
    const matchups = engine.getMatchups(roundNumber, participants, matchHistory);
    // matchups is an array of { home: id, away: id } (away is null if it's a bye)
    return matchups.map((m) => ({
        whitePlayerId: m.home,
        blackPlayerId: m.away || 'BYE',
        isBye: !m.away
    }));
}
function calculateSwissStandings(roundNumber, participants, matchHistory) {
    const standings = engine.getStandings(roundNumber, participants, matchHistory);
    return standings;
}

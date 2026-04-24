import { FieldValue } from 'firebase-admin/firestore';
import { admin } from '../init.js';
import { calculateElo, DEFAULT_ELO } from './eloRating.js';

const db = admin.firestore();

// Fixed Elo ratings for computer opponents in matchmaking
const COMPUTER_ELO_MAP = {
    easy: 800,
    medium: 1200,
    hard: 1600
};

/**
 * Update Elo ratings for players after a ranked game completes.
 * Applies to matchmaking (PvP or vs Computer) and correspondence games.
 * Skips manual computer games, friend games, and pass-and-play.
 * Also stores the pre-game Elo values and deltas on the game document.
 * 
 * @param {string} gameId - The game document ID
 * @param {Object} gameData - The game document data
 * @param {string|null} winnerId - Winner user ID, or null for draw
 */
export async function updateEloOnGameComplete(gameId, gameData, winnerId) {
    try {
        // 1. Check if game is ranked
        // Must be a matchmaking game or a correspondence game
        if (!gameData.matchmakingGame && !gameData.correspondenceGame) {
             console.log(`[updateElo] Game ${gameId} skipped: not a ranked matchmaking or correspondence game.`);
             return;
        }

        // Skip pass-and-play
        if (gameData.opponentType === 'passandplay') {
            console.log(`[updateElo] Game ${gameId} skipped: pass-and-play game.`);
            return;
        }

        const player1Id = gameData.creatorId;
        const player2Id = gameData.opponentId;

        if (!player1Id || !player2Id) {
            console.error(`[updateElo] Game ${gameId} missing player IDs.`);
            return;
        }

        const isOpponentComputer = gameData.opponentType === 'computer' || gameData.opponentId === 'computer';

        // Fetch human player(s) profile
        const p1Ref = db.collection('users').doc(player1Id);
        const p1Doc = await p1Ref.get();

        if (!p1Doc.exists) {
            console.error(`[updateElo] Game ${gameId} missing player 1 document.`);
            return;
        }

        const p1Data = p1Doc.data();
        const p1Elo = p1Data.stats?.elo ?? DEFAULT_ELO;
        const p1RatedGames = p1Data.stats?.ratedGamesPlayed ?? 0;

        let p1Score = 0.5; // Default draw
        if (winnerId === player1Id) p1Score = 1;
        else if (winnerId === player2Id || winnerId === 'computer') p1Score = 0;

        const batch = db.batch();
        const gameRef = db.collection('games').doc(gameId);

        if (isOpponentComputer) {
            // Matchmaking vs Computer
            const difficulty = gameData.difficulty || 'medium';
            const computerElo = COMPUTER_ELO_MAP[difficulty] || DEFAULT_ELO;
            
            // Calculate new Elo (computer is p2)
            const eloResult = calculateElo(p1Elo, computerElo, p1Score, p1RatedGames, 100); // give computer 100 rated games so it uses standard K
            
            console.log(`[updateElo] Game ${gameId} vs Computer(${difficulty}): P1(${p1Elo}->${eloResult.player1NewElo})`);

            // Update human player
            batch.set(p1Ref, {
                stats: {
                    elo: eloResult.player1NewElo,
                    ratedGamesPlayed: FieldValue.increment(1)
                }
            }, { merge: true });

            // Update game doc with historical snapshot
            batch.update(gameRef, {
                eloAtGame: {
                    [player1Id]: p1Elo,
                    computer: computerElo
                },
                eloChange: {
                    [player1Id]: eloResult.player1Delta
                }
            });

        } else {
            // PvP Game
            const p2Ref = db.collection('users').doc(player2Id);
            const p2Doc = await p2Ref.get();

            if (!p2Doc.exists) {
                console.error(`[updateElo] Game ${gameId} missing player 2 document.`);
                return;
            }

            const p2Data = p2Doc.data();
            const p2Elo = p2Data.stats?.elo ?? DEFAULT_ELO;
            const p2RatedGames = p2Data.stats?.ratedGamesPlayed ?? 0;

            const eloResult = calculateElo(p1Elo, p2Elo, p1Score, p1RatedGames, p2RatedGames);

            console.log(`[updateElo] Game ${gameId}: P1(${p1Elo}->${eloResult.player1NewElo}), P2(${p2Elo}->${eloResult.player2NewElo})`);

            // Update player 1
            batch.set(p1Ref, {
                stats: {
                    elo: eloResult.player1NewElo,
                    ratedGamesPlayed: FieldValue.increment(1)
                }
            }, { merge: true });

            // Update player 2
            batch.set(p2Ref, {
                stats: {
                    elo: eloResult.player2NewElo,
                    ratedGamesPlayed: FieldValue.increment(1)
                }
            }, { merge: true });

            // Update game doc with historical snapshot
            batch.update(gameRef, {
                eloAtGame: {
                    [player1Id]: p1Elo,
                    [player2Id]: p2Elo
                },
                eloChange: {
                    [player1Id]: eloResult.player1Delta,
                    [player2Id]: eloResult.player2Delta
                }
            });
        }

        await batch.commit();
        console.log(`[updateElo] Successfully updated Elo for game ${gameId}`);
        
    } catch (error) {
        console.error(`[updateElo] Error updating Elo for game ${gameId}:`, error);
    }
}

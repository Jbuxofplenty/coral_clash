/**
 * Coral Clash Test Fixtures
 * Centralized exports for all game state fixtures
 */

import checkNonTurn from './check-non-turn.json';
import checkPinned2 from './check-pinned-2.json';
import checkPinned from './check-pinned.json';
import coralBlocksAttack from './coral-blocks-attack.json';
import crabCheck from './crab-check.json';
import crabEndOfBoard from './crab-end-of-board.json';
import crabMovement from './crab-movement.json';
import multipleChecks from './multiple-checks.json';
import octopusCheck from './octopus-check.json';
import whaleDoubleJeopardy2 from './whale-double-jeopardy-2.json';
import whaleDoubleJeopardy from './whale-double-jeopardy.json';
import whaleMoveDigonally2 from './whale-move-diagonally-2.json';
import whaleMoveDigonally from './whale-move-diagonally.json';
import whaleRemove2Coral from './whale-remove-2-coral.json';
import whaleRemovesCoral from './whale-removes-coral.json';
import whaleRotation2 from './whale-rotation-2.json';
import whaleRotation from './whale-rotation.json';

// Export as named exports
export {
    checkNonTurn,
    checkPinned,
    checkPinned2,
    coralBlocksAttack,
    crabCheck,
    crabEndOfBoard,
    crabMovement,
    multipleChecks,
    octopusCheck,
    whaleDoubleJeopardy,
    whaleDoubleJeopardy2,
    whaleMoveDigonally,
    whaleMoveDigonally2,
    whaleRemove2Coral,
    whaleRemovesCoral,
    whaleRotation,
    whaleRotation2,
};

// Export fixtures map for dynamic loading (like in FixtureLoaderModal)
export const FIXTURES = {
    'whale-rotation': whaleRotation,
    'whale-rotation-2': whaleRotation2,
    'whale-double-jeopardy': whaleDoubleJeopardy,
    'whale-double-jeopardy-2': whaleDoubleJeopardy2,
    'whale-move-diagonally': whaleMoveDigonally,
    'whale-move-diagonally-2': whaleMoveDigonally2,
    'whale-remove-2-coral': whaleRemove2Coral,
    'octopus-check': octopusCheck,
    'multiple-checks': multipleChecks,
    'check-pinned': checkPinned,
    'check-pinned-2': checkPinned2,
    'crab-end-of-board': crabEndOfBoard,
    'coral-blocks-attack': coralBlocksAttack,
    'whale-removes-coral': whaleRemovesCoral,
    'crab-movement': crabMovement,
    'crab-check': crabCheck,
    'check-non-turn': checkNonTurn,
};

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
import whaleDoubleJeopardy from './whale-double-jeopardy.json';
import whaleMoveDigonally2 from './whale-move-diagonally-2.json';
import whaleMoveDigonally from './whale-move-diagonally.json';
import whaleRemovesCoral from './whale-removes-coral.json';
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
    whaleMoveDigonally,
    whaleMoveDigonally2,
    whaleRemovesCoral,
    whaleRotation,
};

// Export fixtures map for dynamic loading (like in FixtureLoaderModal)
export const FIXTURES = {
    'whale-rotation': whaleRotation,
    'whale-double-jeopardy': whaleDoubleJeopardy,
    'whale-move-diagonally': whaleMoveDigonally,
    'whale-move-diagonally-2': whaleMoveDigonally2,
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

/**
 * Coral Clash Test Fixtures
 * Centralized exports for all game state fixtures
 */

import whaleMoveDigonally from './whale-move-diagonally.json';
import whaleMoveDigonally2 from './whale-move-diagonally-2.json';
import octopusCheck from './octopus-check.json';
import multipleChecks from './multiple-checks.json';
import checkPinned from './check-pinned.json';
import checkPinned2 from './check-pinned-2.json';
import crabEndOfBoard from './crab-end-of-board.json';
import coralBlocksAttack from './coral-blocks-attack.json';
import whaleRemovesCoral from './whale-removes-coral.json';
import crabMovement from './crab-movement.json';
import crabCheck from './crab-check.json';

// Export as named exports
export {
    whaleMoveDigonally,
    whaleMoveDigonally2,
    octopusCheck,
    multipleChecks,
    checkPinned,
    checkPinned2,
    crabEndOfBoard,
    coralBlocksAttack,
    whaleRemovesCoral,
    crabMovement,
    crabCheck,
};

// Export fixtures map for dynamic loading (like in FixtureLoaderModal)
export const FIXTURES = {
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
};

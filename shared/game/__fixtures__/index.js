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
import octoDeleted from './octo-deleted.json';
import octopusCheck from './octopus-check.json';
import whaleAttack from './whale-attack.json';
import whaleCheck10 from './whale-check-10.json';
import whaleCheck11 from './whale-check-11.json';
import whaleCheck2 from './whale-check-2.json';
import whaleCheck3 from './whale-check-3.json';
import whaleCheck4 from './whale-check-4.json';
import whaleCheck5 from './whale-check-5.json';
import whaleCheck6 from './whale-check-6.json';
import whaleCheck7 from './whale-check-7.json';
import whaleCheck8 from './whale-check-8.json';
import whaleCheck9 from './whale-check-9.json';
import whaleCheck from './whale-check.json';
import whaleDoubleJeopardy2 from './whale-double-jeopardy-2.json';
import whaleDoubleJeopardy from './whale-double-jeopardy.json';
import whaleMoveDigonally2 from './whale-move-diagonally-2.json';
import whaleMoveDigonally from './whale-move-diagonally.json';
import whaleRemove2Coral from './whale-remove-2-coral.json';
import whaleRemovesCoral from './whale-removes-coral.json';
import whaleRotation2 from './whale-rotation-2.json';
import whaleRotation4 from './whale-rotation-4.json';
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
    octoDeleted,
    octopusCheck,
    whaleAttack,
    whaleCheck,
    whaleCheck10,
    whaleCheck11,
    whaleCheck2,
    whaleCheck3,
    whaleCheck4,
    whaleCheck5,
    whaleCheck6,
    whaleCheck7,
    whaleCheck8,
    whaleCheck9,
    whaleDoubleJeopardy,
    whaleDoubleJeopardy2,
    whaleMoveDigonally,
    whaleMoveDigonally2,
    whaleRemove2Coral,
    whaleRemovesCoral,
    whaleRotation,
    whaleRotation2,
    whaleRotation4,
};

// Export fixtures map for dynamic loading (like in FixtureLoaderModal)
export const FIXTURES = {
    'whale-rotation': whaleRotation,
    'whale-rotation-2': whaleRotation2,
    'whale-rotation-4': whaleRotation4,
    'octo-deleted': octoDeleted,
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
    'whale-check': whaleCheck,
    'whale-check-2': whaleCheck2,
    'whale-check-3': whaleCheck3,
    'whale-check-4': whaleCheck4,
    'whale-check-5': whaleCheck5,
    'whale-check-6': whaleCheck6,
    'whale-check-7': whaleCheck7,
    'whale-check-8': whaleCheck8,
    'whale-check-9': whaleCheck9,
    'whale-attack': whaleAttack,
};

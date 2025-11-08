// Mock implementation of @jbuxofplenty/coral-clash for tests

export const DEFAULT_POSITION = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
export const GAME_VERSION = '1.0.0';
export const WHALE = 'w';

// Mock CoralClash class
export class CoralClash {
    constructor(position = DEFAULT_POSITION) {
        this._fen = position;
        this._turn = 'w';
    }

    fen() {
        return this._fen;
    }

    turn() {
        return this._turn;
    }

    getCoralRemaining() {
        return { w: 15, b: 14 };
    }
}

export const createGameSnapshot = jest.fn((game) => ({
    fen: game.fen(),
    turn: game.turn(),
    coralRemaining: game.getCoralRemaining(),
}));

export const restoreGameFromSnapshot = jest.fn();
export const calculateUndoMoveCount = jest.fn();


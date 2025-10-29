// Mock for the shared game library
export const GAME_VERSION = '1.0.0';
export const DEFAULT_POSITION = 'ftth1ttf/coc1dcoc/8/8/8/8/COC1DCOC/FTTH1TTF w - - 0 1';

export class CoralClash {
    constructor(fen) {
        this._fen = fen || DEFAULT_POSITION;
    }

    fen() {
        return this._fen;
    }

    turn() {
        return 'w';
    }

    moves() {
        return [];
    }

    move(_move) {
        return null;
    }

    get(_square) {
        return null;
    }

    isCheck() {
        return false;
    }

    isGameOver() {
        return false;
    }
}

export function createGameSnapshot(game) {
    return {
        fen: game._fen || DEFAULT_POSITION,
        turn: 'w',
        coralRemaining: { w: 15, b: 14 },
        history: [],
    };
}

export function restoreGameFromSnapshot(snapshot) {
    return new CoralClash(snapshot.fen);
}

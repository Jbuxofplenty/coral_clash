// Mock for the shared game library
export const GAME_VERSION = '1.0.0';
export const DEFAULT_POSITION =
    'ftth1ttf/cocddcoc/3oo3/8/8/3OO3/COCDDCOC/FTTH1TTF w - - 0 1 a8h,b8h,c8g,f8g,g8h,h8g,a7g,b7h,c7h,d7g,e7h,f7g,g7g,h7h,d6h,e6g,d3g,e3h,a2h,b2g,c2g,d2h,e2g,f2h,g2h,h2g,a1h,b1h,c1g,f1g,g1h,h1g c7b,d6b,e6b,d3w,e3w 15,14 d1e1,d8e8';

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

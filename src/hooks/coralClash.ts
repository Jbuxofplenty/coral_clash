/**
 * @license
 * Copyright (c) 2023, Jeff Hlywa (jhlywa@gmail.com)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 */

export const WHITE = 'w';
export const BLACK = 'b';

// Coral Clash piece symbols
export const CRAB = 'c';
export const TURTLE = 't';
export const OCTOPUS = 'o';
export const PUFFERFISH = 'f';
export const DOLPHIN = 'd';
export const WHALE = 'h';

export type Color = 'w' | 'b';
export type PieceSymbol = 'c' | 't' | 'o' | 'f' | 'd' | 'h';

// prettier-ignore
export type Square =
    'a8' | 'b8' | 'c8' | 'd8' | 'e8' | 'f8' | 'g8' | 'h8' |
    'a7' | 'b7' | 'c7' | 'd7' | 'e7' | 'f7' | 'g7' | 'h7' |
    'a6' | 'b6' | 'c6' | 'd6' | 'e6' | 'f6' | 'g6' | 'h6' |
    'a5' | 'b5' | 'c5' | 'd5' | 'e5' | 'f5' | 'g5' | 'h5' |
    'a4' | 'b4' | 'c4' | 'd4' | 'e4' | 'f4' | 'g4' | 'h4' |
    'a3' | 'b3' | 'c3' | 'd3' | 'e3' | 'f3' | 'g3' | 'h3' |
    'a2' | 'b2' | 'c2' | 'd2' | 'e2' | 'f2' | 'g2' | 'h2' |
    'a1' | 'b1' | 'c1' | 'd1' | 'e1' | 'f1' | 'g1' | 'h1'

// Helper function to determine piece role in Coral Clash starting position
function getStartingRole(square: Square, type: PieceSymbol, color: Color): PieceRole | undefined {
    // Whale doesn't have a role
    if (type === WHALE) return undefined;

    const file = square[0];
    const rank = parseInt(square[1]);

    // Define roles based on Coral Clash setup rules
    if (color === WHITE) {
        if (rank === 1) {
            // Back rank: a1=Hunter Pufferfish, b1=Hunter Turtle, c1=Gatherer Turtle, d1/e1=Whale, f1=Gatherer Turtle, g1=Hunter Turtle, h1=Gatherer Pufferfish
            if (file === 'a' && type === PUFFERFISH) return 'hunter';
            if (file === 'b' && type === TURTLE) return 'hunter';
            if (file === 'c' && type === TURTLE) return 'gatherer';
            if (file === 'f' && type === TURTLE) return 'gatherer';
            if (file === 'g' && type === TURTLE) return 'hunter';
            if (file === 'h' && type === PUFFERFISH) return 'gatherer';
        } else if (rank === 2) {
            // Second rank: a2=Hunter Crab, b2=Gatherer Octopus, c2=Gatherer Crab, d2=Hunter Dolphin, e2=Gatherer Dolphin, f2=Hunter Crab, g2=Hunter Octopus, h2=Gatherer Crab
            if (file === 'a' && type === CRAB) return 'hunter';
            if (file === 'b' && type === OCTOPUS) return 'gatherer';
            if (file === 'c' && type === CRAB) return 'gatherer';
            if (file === 'd' && type === DOLPHIN) return 'hunter';
            if (file === 'e' && type === DOLPHIN) return 'gatherer';
            if (file === 'f' && type === CRAB) return 'hunter';
            if (file === 'g' && type === OCTOPUS) return 'hunter';
            if (file === 'h' && type === CRAB) return 'gatherer';
        } else if (rank === 3) {
            // Third rank octopuses from setup
            if (file === 'd' && type === OCTOPUS) return 'gatherer'; // Octopus with coral
            if (file === 'e' && type === OCTOPUS) return 'gatherer'; // Octopus with coral
        }
    } else if (color === BLACK) {
        if (rank === 8) {
            // Back rank (mirror of white)
            if (file === 'a' && type === PUFFERFISH) return 'hunter';
            if (file === 'b' && type === TURTLE) return 'hunter';
            if (file === 'c' && type === TURTLE) return 'gatherer';
            if (file === 'f' && type === TURTLE) return 'gatherer';
            if (file === 'g' && type === TURTLE) return 'hunter';
            if (file === 'h' && type === PUFFERFISH) return 'gatherer';
        } else if (rank === 7) {
            // Seventh rank (mirror of white's second rank)
            if (file === 'a' && type === CRAB) return 'hunter';
            if (file === 'b' && type === OCTOPUS) return 'gatherer';
            if (file === 'c' && type === CRAB) return 'gatherer';
            if (file === 'd' && type === DOLPHIN) return 'hunter';
            if (file === 'e' && type === DOLPHIN) return 'gatherer';
            if (file === 'f' && type === CRAB) return 'hunter';
            if (file === 'g' && type === OCTOPUS) return 'hunter';
            if (file === 'h' && type === CRAB) return 'gatherer';
        } else if (rank === 6) {
            // Sixth rank octopuses
            if (file === 'd' && type === OCTOPUS) return 'gatherer'; // Octopus with coral
            if (file === 'e' && type === OCTOPUS) return 'gatherer'; // Octopus with coral
        }
    }

    // Default to hunter if not specified (safety fallback)
    return 'hunter';
}

// Coral Clash starting position based on official rules:
// Back rank (rank 1/8): Pufferfish (f) in corners, Turtles (t) next to them, Whale (h) in center spanning d-e
// Second rank (rank 2/7): Crab-Octopus-Crab-Dolphin-Dolphin-Crab-Octopus-Crab pattern
// Third rank (rank 3/6): Octopuses with coral underneath (d3, e3 for white; d6, e6 for black)
//
// IMPORTANT: Whale FEN notation
// - Whale spans 2 squares (d1-e1 for white, d8-e8 for black)
// - In FEN: 'H' appears only at first square (d-file), second square (e-file) shown as '1' (empty)
// - Internally: Whale occupies BOTH squares (stored in _kings array)
// - This is a simplified FEN representation since standard FEN doesn't support 2-square pieces
//
// Coral placement (tracked separately, initialized in _initializeStartingCoral):
//   - White: d3, e3 have coral (under Gatherer Octopuses)
//   - Black: d6, e6 have coral (under Gatherer Octopuses)
//   - Blue player (black) places one additional coral
export const DEFAULT_POSITION = 'ftth1ttf/cocddcoc/3oo3/8/8/3OO3/COCDDCOC/FTTH1TTF w - - 0 1';

export type PieceRole = 'hunter' | 'gatherer';

export type Piece = {
    color: Color;
    type: PieceSymbol;
    role?: PieceRole; // Hunter or Gatherer (Whale doesn't have a role)
};

type InternalMove = {
    color: Color;
    from: number;
    to: number;
    piece: PieceSymbol;
    captured?: PieceSymbol;
    capturedRole?: PieceRole; // Role of captured piece (for proper undo in Coral Clash)
    promotion?: PieceSymbol;
    flags: number;
    // Coral Clash specific
    coralPlaced?: boolean; // Gatherer placed coral
    coralRemoved?: boolean; // Hunter removed coral
    // whaleOtherHalf removed - no longer needed with new whale data structure
};

interface History {
    move: InternalMove;
    kings: Record<Color, [number, number]>; // Whale positions (both squares)
    turn: Color;
    epSquare: number;
    halfMoves: number;
    moveNumber: number;
    // Coral Clash specific
    coral: Array<Color | null>; // Snapshot of coral state
    coralRemaining: Record<Color, number>; // Snapshot of remaining coral
}

export type Move = {
    color: Color;
    from: Square;
    to: Square;
    piece: PieceSymbol;
    captured?: PieceSymbol;
    promotion?: PieceSymbol;
    flags: string;
    san: string;
    lan: string;
    before: string;
    after: string;
    // Whale-specific fields for 2-square piece
    whaleSecondSquare?: Square; // Where the other half of the whale ends up after this move
    whaleOrientation?: 'horizontal' | 'vertical'; // Final orientation after move
};

const EMPTY = -1;

const FLAGS: Record<string, string> = {
    NORMAL: 'n',
    CAPTURE: 'c',
    BIG_PAWN: 'b',
    EP_CAPTURE: 'e',
    PROMOTION: 'p',
};

// prettier-ignore
export const SQUARES: Square[] = [
  'a8', 'b8', 'c8', 'd8', 'e8', 'f8', 'g8', 'h8',
  'a7', 'b7', 'c7', 'd7', 'e7', 'f7', 'g7', 'h7',
  'a6', 'b6', 'c6', 'd6', 'e6', 'f6', 'g6', 'h6',
  'a5', 'b5', 'c5', 'd5', 'e5', 'f5', 'g5', 'h5',
  'a4', 'b4', 'c4', 'd4', 'e4', 'f4', 'g4', 'h4',
  'a3', 'b3', 'c3', 'd3', 'e3', 'f3', 'g3', 'h3',
  'a2', 'b2', 'c2', 'd2', 'e2', 'f2', 'g2', 'h2',
  'a1', 'b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'
]

const BITS: Record<string, number> = {
    NORMAL: 1,
    CAPTURE: 2,
    BIG_PAWN: 4,
    EP_CAPTURE: 8,
    PROMOTION: 16,
    // Castle bits removed - not used in Coral Clash
};

/*
 * NOTES ABOUT 0x88 MOVE GENERATION ALGORITHM
 * ----------------------------------------------------------------------------
 * From https://github.com/jhlywa/chess.js/issues/230
 *
 * A lot of people are confused when they first see the internal representation
 * of chess.js. It uses the 0x88 Move Generation Algorithm which internally
 * stores the board as an 8x16 array. This is purely for efficiency but has a
 * couple of interesting benefits:
 *
 * 1. 0x88 offers a very inexpensive "off the board" check. Bitwise AND (&) any
 *    square with 0x88, if the result is non-zero then the square is off the
 *    board. For example, assuming a knight square A8 (0 in 0x88 notation),
 *    there are 8 possible directions in which the knight can move. These
 *    directions are relative to the 8x16 board and are stored in the
 *    PIECE_OFFSETS map. One possible move is A8 - 18 (up one square, and two
 *    squares to the left - which is off the board). 0 - 18 = -18 & 0x88 = 0x88
 *    (because of two-complement representation of -18). The non-zero result
 *    means the square is off the board and the move is illegal. Take the
 *    opposite move (from A8 to C7), 0 + 18 = 18 & 0x88 = 0. A result of zero
 *    means the square is on the board.
 *
 * 2. The relative distance (or difference) between two squares on a 8x16 board
 *    is unique and can be used to inexpensively determine if a piece on a
 *    square can attack any other arbitrary square. For example, let's see if a
 *    pawn on E7 can attack E2. The difference between E7 (20) - E2 (100) is
 *    -80. We add 119 to make the ATTACKS array index non-negative (because the
 *    worst case difference is A8 - H1 = -119). The ATTACKS array contains a
 *    bitmask of pieces that can attack from that distance and direction.
 *    ATTACKS[-80 + 119=39] gives us 24 or 0b11000 in binary. Look at the
 *    PIECE_MASKS map to determine the mask for a given piece type. In our pawn
 *    example, we would check to see if 24 & 0x1 is non-zero, which it is
 *    not. So, naturally, a pawn on E7 can't attack a piece on E2. However, a
 *    rook can since 24 & 0x8 is non-zero. The only thing left to check is that
 *    there are no blocking pieces between E7 and E2. That's where the RAYS
 *    array comes in. It provides an offset (in this case 16) to add to E7 (20)
 *    to check for blocking pieces. E7 (20) + 16 = E6 (36) + 16 = E5 (52) etc.
 */

// prettier-ignore
// eslint-disable-next-line
const Ox88: Record<Square, number> = {
  a8:   0, b8:   1, c8:   2, d8:   3, e8:   4, f8:   5, g8:   6, h8:   7,
  a7:  16, b7:  17, c7:  18, d7:  19, e7:  20, f7:  21, g7:  22, h7:  23,
  a6:  32, b6:  33, c6:  34, d6:  35, e6:  36, f6:  37, g6:  38, h6:  39,
  a5:  48, b5:  49, c5:  50, d5:  51, e5:  52, f5:  53, g5:  54, h5:  55,
  a4:  64, b4:  65, c4:  66, d4:  67, e4:  68, f4:  69, g4:  70, h4:  71,
  a3:  80, b3:  81, c3:  82, d3:  83, e3:  84, f3:  85, g3:  86, h3:  87,
  a2:  96, b2:  97, c2:  98, d2:  99, e2: 100, f2: 101, g2: 102, h2: 103,
  a1: 112, b1: 113, c1: 114, d1: 115, e1: 116, f1: 117, g1: 118, h1: 119
}

// Coral Clash Movement Patterns
// Crabs move 1 square orthogonally (vertical/horizontal)
const CRAB_OFFSETS = [-16, 1, 16, -1];

const PIECE_OFFSETS = {
    t: [-16, 1, 16, -1], // Turtle: moves any distance orthogonally
    o: [-17, -15, 17, 15], // Octopus: moves 1 square diagonally
    f: [-17, -15, 17, 15], // Pufferfish: moves any distance diagonally
    d: [-17, -16, -15, 1, 17, 16, 15, -1], // Dolphin: moves any distance in all 8 directions
    h: [-17, -16, -15, 1, 17, 16, 15, -1], // Whale: special 2-square piece (needs custom logic)
};

// prettier-ignore
const ATTACKS = [
  20, 0, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0, 0,20, 0,
   0,20, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0,20, 0, 0,
   0, 0,20, 0, 0, 0, 0, 24,  0, 0, 0, 0,20, 0, 0, 0,
   0, 0, 0,20, 0, 0, 0, 24,  0, 0, 0,20, 0, 0, 0, 0,
   0, 0, 0, 0,20, 0, 0, 24,  0, 0,20, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0,20, 2, 24,  2,20, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0, 2,53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
  24,24,24,24,24,24,56,  0, 56,24,24,24,24,24,24, 0,
   0, 0, 0, 0, 0, 2,53, 56, 53, 2, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0, 0,20, 2, 24,  2,20, 0, 0, 0, 0, 0, 0,
   0, 0, 0, 0,20, 0, 0, 24,  0, 0,20, 0, 0, 0, 0, 0,
   0, 0, 0,20, 0, 0, 0, 24,  0, 0, 0,20, 0, 0, 0, 0,
   0, 0,20, 0, 0, 0, 0, 24,  0, 0, 0, 0,20, 0, 0, 0,
   0,20, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0,20, 0, 0,
  20, 0, 0, 0, 0, 0, 0, 24,  0, 0, 0, 0, 0, 0,20
];

// prettier-ignore
const RAYS = [
   17,  0,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0,  0, 15, 0,
    0, 17,  0,  0,  0,  0,  0, 16,  0,  0,  0,  0,  0, 15,  0, 0,
    0,  0, 17,  0,  0,  0,  0, 16,  0,  0,  0,  0, 15,  0,  0, 0,
    0,  0,  0, 17,  0,  0,  0, 16,  0,  0,  0, 15,  0,  0,  0, 0,
    0,  0,  0,  0, 17,  0,  0, 16,  0,  0, 15,  0,  0,  0,  0, 0,
    0,  0,  0,  0,  0, 17,  0, 16,  0, 15,  0,  0,  0,  0,  0, 0,
    0,  0,  0,  0,  0,  0, 17, 16, 15,  0,  0,  0,  0,  0,  0, 0,
    1,  1,  1,  1,  1,  1,  1,  0, -1, -1,  -1,-1, -1, -1, -1, 0,
    0,  0,  0,  0,  0,  0,-15,-16,-17,  0,  0,  0,  0,  0,  0, 0,
    0,  0,  0,  0,  0,-15,  0,-16,  0,-17,  0,  0,  0,  0,  0, 0,
    0,  0,  0,  0,-15,  0,  0,-16,  0,  0,-17,  0,  0,  0,  0, 0,
    0,  0,  0,-15,  0,  0,  0,-16,  0,  0,  0,-17,  0,  0,  0, 0,
    0,  0,-15,  0,  0,  0,  0,-16,  0,  0,  0,  0,-17,  0,  0, 0,
    0,-15,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,-17,  0, 0,
  -15,  0,  0,  0,  0,  0,  0,-16,  0,  0,  0,  0,  0,  0,-17
];

const PIECE_MASKS = { c: 0x1, t: 0x2, o: 0x4, f: 0x8, d: 0x10, h: 0x20 };

const SYMBOLS = 'ctofdhCTOFDH';

const PROMOTIONS: PieceSymbol[] = [TURTLE, OCTOPUS, PUFFERFISH, DOLPHIN];

const RANK_1 = 7;
const RANK_2 = 6;
/*
 * const RANK_3 = 5
 * const RANK_4 = 4
 * const RANK_5 = 3
 * const RANK_6 = 2
 */
const RANK_7 = 1;
const RANK_8 = 0;

const SECOND_RANK = { b: RANK_7, w: RANK_2 };

const TERMINATION_MARKERS = ['1-0', '0-1', '1/2-1/2', '*'];

// Extracts the zero-based rank of an 0x88 square.
function rank(square: number): number {
    return square >> 4;
}

// Extracts the zero-based file of an 0x88 square.
function file(square: number): number {
    return square & 0xf;
}

function isDigit(c: string): boolean {
    return '0123456789'.indexOf(c) !== -1;
}

// Converts a 0x88 square to algebraic notation.
function algebraic(square: number): Square {
    const f = file(square);
    const r = rank(square);
    return ('abcdefgh'.substring(f, f + 1) + '87654321'.substring(r, r + 1)) as Square;
}

function swapColor(color: Color): Color {
    return color === WHITE ? BLACK : WHITE;
}

export function validateFen(fen: string) {
    // 1st criterion: 6 space-seperated fields?
    const tokens = fen.split(/\s+/);
    if (tokens.length !== 6) {
        return {
            ok: false,
            error: 'Invalid FEN: must contain six space-delimited fields',
        };
    }

    // 2nd criterion: move number field is a integer value > 0?
    const moveNumber = parseInt(tokens[5], 10);
    if (isNaN(moveNumber) || moveNumber <= 0) {
        return {
            ok: false,
            error: 'Invalid FEN: move number must be a positive integer',
        };
    }

    // 3rd criterion: half move counter is an integer >= 0?
    const halfMoves = parseInt(tokens[4], 10);
    if (isNaN(halfMoves) || halfMoves < 0) {
        return {
            ok: false,
            error: 'Invalid FEN: half move counter number must be a non-negative integer',
        };
    }

    // 4th criterion: 4th field is a valid e.p.-string?
    if (!/^(-|[abcdefgh][36])$/.test(tokens[3])) {
        return { ok: false, error: 'Invalid FEN: en-passant square is invalid' };
    }

    // 5th criterion: 3rd field is castling (not used in Coral Clash, but must be valid format)
    if (!/^(-|[kKqQ]{1,4})$/.test(tokens[2])) {
        return {
            ok: false,
            error: 'Invalid FEN: castling field must be - or valid castling string',
        };
    }

    // 6th criterion: 2nd field is "w" (white) or "b" (black)?
    if (!/^(w|b)$/.test(tokens[1])) {
        return { ok: false, error: 'Invalid FEN: side-to-move is invalid' };
    }

    // 7th criterion: 1st field contains 8 rows?
    const rows = tokens[0].split('/');
    if (rows.length !== 8) {
        return {
            ok: false,
            error: "Invalid FEN: piece data does not contain 8 '/'-delimited rows",
        };
    }

    // 8th criterion: every row is valid?
    for (let i = 0; i < rows.length; i++) {
        // check for right sum of fields AND not two numbers in succession
        let sumFields = 0;
        let previousWasNumber = false;

        for (let k = 0; k < rows[i].length; k++) {
            if (isDigit(rows[i][k])) {
                if (previousWasNumber) {
                    return {
                        ok: false,
                        error: 'Invalid FEN: piece data is invalid (consecutive number)',
                    };
                }
                sumFields += parseInt(rows[i][k], 10);
                previousWasNumber = true;
            } else {
                if (!/^[ctofdhCTOFDH]$/.test(rows[i][k])) {
                    return {
                        ok: false,
                        error: 'Invalid FEN: piece data is invalid (invalid piece)',
                    };
                }
                sumFields += 1;
                previousWasNumber = false;
            }
        }
        if (sumFields !== 8) {
            return {
                ok: false,
                error: 'Invalid FEN: piece data is invalid (too many squares in rank)',
            };
        }
    }

    // 9th criterion: is en-passant square legal?
    if ((tokens[3][1] == '3' && tokens[1] == 'w') || (tokens[3][1] == '6' && tokens[1] == 'b')) {
        return { ok: false, error: 'Invalid FEN: illegal en-passant square' };
    }

    // 10th criterion: does position contain exactly two whales?
    const whales = [
        { color: 'white', regex: /H/g },
        { color: 'black', regex: /h/g },
    ];

    for (const { color, regex } of whales) {
        if (!regex.test(tokens[0])) {
            return { ok: false, error: `Invalid FEN: missing ${color} whale` };
        }

        if ((tokens[0].match(regex) || []).length > 1) {
            return { ok: false, error: `Invalid FEN: too many ${color} whales` };
        }
    }

    // 11th criterion: are any crabs on the first or eighth rows?
    if (Array.from(rows[0] + rows[7]).some((char) => char.toUpperCase() === 'C')) {
        return {
            ok: false,
            error: 'Invalid FEN: some crabs are on the edge rows',
        };
    }

    return { ok: true };
}

// this function is used to uniquely identify ambiguous moves
function getDisambiguator(move: InternalMove, moves: InternalMove[]) {
    const from = move.from;
    const to = move.to;
    const piece = move.piece;

    let ambiguities = 0;
    let sameRank = 0;
    let sameFile = 0;

    for (let i = 0, len = moves.length; i < len; i++) {
        const ambigFrom = moves[i].from;
        const ambigTo = moves[i].to;
        const ambigPiece = moves[i].piece;

        /*
         * if a move of the same piece type ends on the same to square, we'll need
         * to add a disambiguator to the algebraic notation
         */
        if (piece === ambigPiece && from !== ambigFrom && to === ambigTo) {
            ambiguities++;

            if (rank(from) === rank(ambigFrom)) {
                sameRank++;
            }

            if (file(from) === file(ambigFrom)) {
                sameFile++;
            }
        }
    }

    if (ambiguities > 0) {
        if (sameRank > 0 && sameFile > 0) {
            /*
             * if there exists a similar moving piece on the same rank and file as
             * the move in question, use the square as the disambiguator
             */
            return algebraic(from);
        } else if (sameFile > 0) {
            /*
             * if the moving piece rests on the same file, use the rank symbol as the
             * disambiguator
             */
            return algebraic(from).charAt(1);
        } else {
            // else use the file symbol
            return algebraic(from).charAt(0);
        }
    }

    return '';
}

function addMove(
    moves: InternalMove[],
    color: Color,
    from: number,
    to: number,
    piece: PieceSymbol,
    captured: PieceSymbol | undefined = undefined,
    flags: number = BITS.NORMAL,
    capturedRole: PieceRole | undefined = undefined,
) {
    // In Coral Clash, no automatic promotions - reaching back row triggers scoring phase
    // This will be handled separately in game logic
    moves.push({
        color,
        from,
        to,
        piece,
        captured,
        capturedRole,
        flags,
    });
}

function inferPieceType(san: string) {
    let pieceType = san.charAt(0);
    if (pieceType >= 'a' && pieceType <= 'h') {
        const matches = san.match(/[a-h]\d.*[a-h]\d/);
        if (matches) {
            return undefined;
        }
        return CRAB;
    }
    pieceType = pieceType.toLowerCase();
    // In Coral Clash: c=crab, t=turtle, o=octopus, f=pufferfish, d=dolphin, h=whale
    // No special cases needed - just return the piece type
    return pieceType as PieceSymbol;
}

// parses all of the decorators out of a SAN string
function strippedSan(move: string) {
    return move.replace(/=/, '').replace(/[+#]?[?!]*$/, '');
}

function trimFen(fen: string): string {
    /*
     * remove last two fields in FEN string as they're not needed when checking
     * for repetition
     */
    return fen.split(' ').slice(0, 4).join(' ');
}

export class CoralClash {
    private _board = new Array<Piece>(128);
    private _turn: Color = WHITE;
    private _header: Record<string, string> = {};
    // Whale always occupies TWO adjacent squares
    // _kings stores both squares as [firstSquare, secondSquare]
    private _kings: Record<Color, [number, number]> = {
        w: [EMPTY, EMPTY],
        b: [EMPTY, EMPTY],
    };
    private _epSquare = -1;
    private _halfMoves = 0;
    private _moveNumber = 0;
    private _history: History[] = [];
    private _comments: Record<string, string> = {};

    // Coral Clash specific state
    private _coral = new Array<Color | null>(128); // Tracks which squares have coral and which color
    private _coralRemaining: Record<Color, number> = { w: 17, b: 17 }; // Each player starts with 17 coral

    // tracks number of times a position has been seen for repetition checking
    private _positionCount: Record<string, number> = {};

    constructor(fen = DEFAULT_POSITION) {
        this.load(fen);
        // Initialize starting coral if loading default position
        if (fen === DEFAULT_POSITION) {
            this._initializeStartingCoral();
        }
    }

    /**
     * Initialize coral placement for the Coral Clash starting position
     */
    private _initializeStartingCoral() {
        // Place coral under Gatherer Octopuses for white (d3, e3)
        this._coral[Ox88.d3] = WHITE;
        this._coralRemaining.w--;
        this._coral[Ox88.e3] = WHITE;
        this._coralRemaining.w--;

        // Place coral under Gatherer Octopuses for black (d6, e6)
        this._coral[Ox88.d6] = BLACK;
        this._coralRemaining.b--;
        this._coral[Ox88.e6] = BLACK;
        this._coralRemaining.b--;

        // Blue player (black) places one additional coral - defaulting to a6 for now
        // In actual game, this would be chosen by the player
        this._coral[Ox88.a6] = BLACK;
        this._coralRemaining.b--;
    }

    clear({ preserveHeaders = false } = {}) {
        this._board = new Array<Piece>(128);
        this._kings = { w: [EMPTY, EMPTY], b: [EMPTY, EMPTY] };
        this._turn = WHITE;
        this._epSquare = EMPTY;
        this._halfMoves = 0;
        this._moveNumber = 1;
        this._history = [];
        this._comments = {};
        this._header = preserveHeaders ? this._header : {};
        this._positionCount = {};

        // Clear Coral Clash specific state
        this._coral = new Array<Color | null>(128);
        this._coralRemaining = { w: 17, b: 17 };

        /*
         * Delete the SetUp and FEN headers (if preserved), the board is empty and
         * these headers don't make sense in this state. They'll get added later
         * via .load() or .put()
         */
        delete this._header['SetUp'];
        delete this._header['FEN'];
    }

    removeHeader(key: string) {
        if (key in this._header) {
            delete this._header[key];
        }
    }

    load(fen: string, { skipValidation = false, preserveHeaders = false } = {}) {
        let tokens = fen.split(/\s+/);

        // append commonly omitted fen tokens
        if (tokens.length >= 2 && tokens.length < 6) {
            const adjustments = ['-', '-', '0', '1'];
            fen = tokens.concat(adjustments.slice(-(6 - tokens.length))).join(' ');
        }

        tokens = fen.split(/\s+/);

        if (!skipValidation) {
            const { ok, error } = validateFen(fen);
            if (!ok) {
                throw new Error(error);
            }
        }

        const position = tokens[0];
        let square = 0;

        this.clear({ preserveHeaders });

        for (let i = 0; i < position.length; i++) {
            const piece = position.charAt(i);

            if (piece === '/') {
                square += 8;
            } else if (isDigit(piece)) {
                square += parseInt(piece, 10);
            } else {
                const color = piece < 'a' ? WHITE : BLACK;
                const type = piece.toLowerCase() as PieceSymbol;
                const sq = algebraic(square);
                // Assign role based on starting position in Coral Clash
                const role = getStartingRole(sq, type, color);
                this._put({ type, color, role }, sq);
                square++;
            }
        }

        this._turn = tokens[1] as Color;

        // Castling is not used in Coral Clash (tokens[2] is ignored)

        this._epSquare = tokens[3] === '-' ? EMPTY : Ox88[tokens[3] as Square];
        this._halfMoves = parseInt(tokens[4], 10);
        this._moveNumber = parseInt(tokens[5], 10);

        this._updateSetup(fen);
        this._incPositionCount(fen);
    }

    fen() {
        let empty = 0;
        let fen = '';

        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (this._board[i]) {
                if (empty > 0) {
                    fen += empty;
                    empty = 0;
                }
                const { color, type: piece } = this._board[i];

                fen += color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
            } else {
                empty++;
            }

            if ((i + 1) & 0x88) {
                if (empty > 0) {
                    fen += empty;
                }

                if (i !== Ox88.h1) {
                    fen += '/';
                }

                empty = 0;
                i += 8;
            }
        }

        // Castling is not used in Coral Clash
        const castling = '-';

        let epSquare = '-';
        /*
         * only print the ep square if en passant is a valid move (pawn is present
         * and ep capture is not pinned)
         */
        if (this._epSquare !== EMPTY) {
            const bigPawnSquare = this._epSquare + (this._turn === WHITE ? 16 : -16);
            const squares = [bigPawnSquare + 1, bigPawnSquare - 1];

            for (const square of squares) {
                // is the square off the board?
                if (square & 0x88) {
                    continue;
                }

                const color = this._turn;

                // is there a crab that can capture the epSquare?
                if (this._board[square]?.color === color && this._board[square]?.type === CRAB) {
                    // if the crab makes an ep capture, does it leave its whale in check?
                    this._makeMove({
                        color,
                        from: square,
                        to: this._epSquare,
                        piece: CRAB,
                        captured: CRAB,
                        flags: BITS.EP_CAPTURE,
                    });
                    const isLegal = !this._isKingAttacked(color);
                    this._undoMove();

                    // if ep is legal, break and set the ep square in the FEN output
                    if (isLegal) {
                        epSquare = algebraic(this._epSquare);
                        break;
                    }
                }
            }
        }

        return [fen, this._turn, castling, epSquare, this._halfMoves, this._moveNumber].join(' ');
    }

    /*
     * Called when the initial board setup is changed with put() or remove().
     * modifies the SetUp and FEN properties of the header object. If the FEN
     * is equal to the default position, the SetUp and FEN are deleted the setup
     * is only updated if history.length is zero, ie moves haven't been made.
     */
    private _updateSetup(fen: string) {
        if (this._history.length > 0) return;

        if (fen !== DEFAULT_POSITION) {
            this._header['SetUp'] = '1';
            this._header['FEN'] = fen;
        } else {
            delete this._header['SetUp'];
            delete this._header['FEN'];
        }
    }

    reset() {
        this.load(DEFAULT_POSITION);
    }

    get(square: Square) {
        const sq = Ox88[square];

        // Check if piece is in _board first
        if (this._board[sq]) {
            return this._board[sq];
        }

        // Check if this square is the second square of a whale
        if (this._kings.w[1] === sq && this._kings.w[0] !== EMPTY) {
            // Return the whale piece from the first square
            return this._board[this._kings.w[0]] || false;
        }
        if (this._kings.b[1] === sq && this._kings.b[0] !== EMPTY) {
            // Return the whale piece from the first square
            return this._board[this._kings.b[0]] || false;
        }

        return false;
    }

    put(
        { type, color, role }: { type: PieceSymbol; color: Color; role?: PieceRole },
        square: Square,
    ) {
        if (this._put({ type, color, role }, square)) {
            this._updateSetup(this.fen());
            return true;
        }
        return false;
    }

    private _put(
        { type, color, role }: { type: PieceSymbol; color: Color; role?: PieceRole },
        square: Square,
    ) {
        // check for piece
        if (SYMBOLS.indexOf(type.toLowerCase()) === -1) {
            return false;
        }

        // check for valid square
        if (!(square in Ox88)) {
            return false;
        }

        const sq = Ox88[square];

        // don't let the user place more than one king
        if (type == WHALE && !(this._kings[color][0] == EMPTY || this._kings[color][0] == sq)) {
            return false;
        }

        const currentPieceOnSquare = this._board[sq];

        // if one of the kings will be replaced by the piece from args, remove it from both squares
        if (currentPieceOnSquare && currentPieceOnSquare.type === WHALE) {
            const [first, second] = this._kings[currentPieceOnSquare.color];
            if (first !== EMPTY) delete this._board[first];
            if (second !== EMPTY) delete this._board[second];
            this._kings[currentPieceOnSquare.color] = [EMPTY, EMPTY];
        }

        const piece = { type: type as PieceSymbol, color: color as Color, role };
        this._board[sq] = piece;

        if (type === WHALE) {
            // Whale spans 2 squares - initially placed horizontally in starting position
            const secondSq = sq + 1; // Second square starts one to the right (can change via rotation)

            // Store whale at only the first square (board() will show both)
            this._kings[color] = [sq, secondSq];
            // piece already stored at sq by line above, no need to duplicate
        }

        return true;
    }

    remove(square: Square) {
        const piece = this.get(square);
        delete this._board[Ox88[square]];
        if (piece && piece.type === WHALE) {
            // Remove whale from both squares
            const [first, second] = this._kings[piece.color];
            if (first !== EMPTY) delete this._board[first];
            if (second !== EMPTY) delete this._board[second];
            this._kings[piece.color] = [EMPTY, EMPTY];
        }

        this._updateSetup(this.fen());

        return piece;
    }

    private _attacked(color: Color, square: number) {
        const targetSquare = algebraic(square);

        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            // did we run off the end of the board
            if (i & 0x88) {
                i += 7;
                continue;
            }

            // if empty square or wrong color
            if (this._board[i] === undefined || this._board[i].color !== color) {
                continue;
            }

            const piece = this._board[i];
            const difference = i - square;

            // skip - to/from square are the same
            if (difference === 0) {
                continue;
            }

            const index = difference + 119;

            if (ATTACKS[index] & PIECE_MASKS[piece.type]) {
                if (piece.type === CRAB) {
                    if (difference > 0) {
                        if (piece.color === WHITE) return true;
                    } else {
                        if (piece.color === BLACK) return true;
                    }
                    continue;
                }

                // if the piece is a turtle or a whale
                if (piece.type === 't' || piece.type === 'h') return true;

                const offset = RAYS[index];
                let j = i + offset;

                let blocked = false;
                while (j !== square) {
                    // Check if square is occupied (including whale's second square)
                    if (this._isSquareOccupied(j)) {
                        blocked = true;
                        break;
                    }
                    j += offset;
                }

                if (!blocked) return true;
            }
        }

        return false;
    }

    private _isKingAttacked(color: Color) {
        // Whale occupies 2 squares - it's in check if EITHER square is attacked
        const [firstSquare, secondSquare] = this._kings[color];

        if (firstSquare === -1) return false;

        const attackingColor = swapColor(color);

        // Check if first square is attacked
        if (this._attacked(attackingColor, firstSquare)) return true;

        // Check if second square is attacked
        if (secondSquare !== -1 && this._attacked(attackingColor, secondSquare)) return true;

        return false;
    }

    isAttacked(square: Square, attackedBy: Color) {
        return this._attacked(attackedBy, Ox88[square]);
    }

    isCheck() {
        return this._isKingAttacked(this._turn);
    }

    inCheck() {
        return this.isCheck();
    }

    isCheckmate() {
        return this.isCheck() && this._moves().length === 0;
    }

    isStalemate() {
        return !this.isCheck() && this._moves().length === 0;
    }

    isInsufficientMaterial() {
        /*
         * Coral Clash insufficient material checks
         * Based on piece combinations that cannot achieve coral victory
         */
        const pieces: Record<PieceSymbol, number> = {
            o: 0,
            t: 0,
            f: 0,
            d: 0,
            h: 0,
            c: 0,
        };
        const octopuses = [];
        let numPieces = 0;
        let squareColor = 0;

        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            squareColor = (squareColor + 1) % 2;
            if (i & 0x88) {
                i += 7;
                continue;
            }

            const piece = this._board[i];
            if (piece) {
                pieces[piece.type] = piece.type in pieces ? pieces[piece.type] + 1 : 1;
                if (piece.type === OCTOPUS) {
                    octopuses.push(squareColor);
                }
                numPieces++;
            }
        }

        // whale vs. whale
        if (numPieces === 2) {
            return true;
        } else if (
            // whale vs. whale + turtle .... or .... whale vs. whale + octopus
            numPieces === 3 &&
            (pieces[OCTOPUS] === 1 || pieces[TURTLE] === 1)
        ) {
            return true;
        } else if (numPieces === pieces[OCTOPUS] + 2) {
            // whale + octopus vs. whale + octopus where all octopuses are on the same color
            let sum = 0;
            const len = octopuses.length;
            for (let i = 0; i < len; i++) {
                sum += octopuses[i];
            }
            if (sum === 0 || sum === len) {
                return true;
            }
        }

        return false;
    }

    isThreefoldRepetition(): boolean {
        return this._getPositionCount(this.fen()) >= 3;
    }

    isDraw() {
        return (
            this._halfMoves >= 100 || // 50 moves per side = 100 half moves
            this.isStalemate() ||
            this.isInsufficientMaterial() ||
            this.isThreefoldRepetition()
        );
    }

    isGameOver() {
        return (
            this.isCheckmate() ||
            this.isStalemate() ||
            this.isDraw() ||
            this.isCoralVictory() !== null
        );
    }

    /**
     * Check if coral scoring should be triggered
     */
    private _shouldTriggerCoralScoring(): boolean {
        // Trigger if any player has placed all their coral
        if (this._coralRemaining.w === 0 || this._coralRemaining.b === 0) {
            return true;
        }

        // Trigger if any player only has the Whale remaining
        let whitePieceCount = 0;
        let blackPieceCount = 0;
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (i & 0x88) {
                i += 7;
                continue;
            }
            if (this._board[i]) {
                if (this._board[i].color === WHITE && this._board[i].type !== WHALE) {
                    whitePieceCount++;
                }
                if (this._board[i].color === BLACK && this._board[i].type !== WHALE) {
                    blackPieceCount++;
                }
            }
        }
        if (whitePieceCount === 0 || blackPieceCount === 0) {
            return true;
        }

        // Trigger if a Crab or Octopus reaches the opponent's back row
        // White back row is rank 1, Black back row is rank 8
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (i & 0x88) {
                i += 7;
                continue;
            }
            const piece = this._board[i];
            if (!piece) continue;

            const r = rank(i);
            // White pieces reaching rank 8 (black's back row)
            if (
                piece.color === WHITE &&
                r === RANK_8 &&
                (piece.type === CRAB || piece.type === OCTOPUS)
            ) {
                return true;
            }
            // Black pieces reaching rank 1 (white's back row)
            if (
                piece.color === BLACK &&
                r === RANK_1 &&
                (piece.type === CRAB || piece.type === OCTOPUS)
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Check for coral victory and return the winner, or null if no coral victory
     */
    isCoralVictory(): Color | null {
        if (!this._shouldTriggerCoralScoring()) {
            return null;
        }

        const whiteControl = this.getCoralAreaControl(WHITE);
        const blackControl = this.getCoralAreaControl(BLACK);

        if (whiteControl > blackControl) {
            return WHITE;
        } else if (blackControl > whiteControl) {
            return BLACK;
        }

        // Tie in coral control - game continues (or could be a draw)
        return null;
    }

    moves(): string[];
    moves({ square }: { square: Square }): string[];
    moves({ piece }: { piece: PieceSymbol }): string[];

    moves({ square, piece }: { square: Square; piece: PieceSymbol }): string[];

    moves({ verbose, square }: { verbose: true; square?: Square }): Move[];
    moves({ verbose, square }: { verbose: false; square?: Square }): string[];
    moves({ verbose, square }: { verbose?: boolean; square?: Square }): string[] | Move[];

    moves({ verbose, piece }: { verbose: true; piece?: PieceSymbol }): Move[];
    moves({ verbose, piece }: { verbose: false; piece?: PieceSymbol }): string[];
    moves({ verbose, piece }: { verbose?: boolean; piece?: PieceSymbol }): string[] | Move[];

    moves({
        verbose,
        square,
        piece,
    }: {
        verbose: true;
        square?: Square;
        piece?: PieceSymbol;
    }): Move[];
    moves({
        verbose,
        square,
        piece,
    }: {
        verbose: false;
        square?: Square;
        piece?: PieceSymbol;
    }): string[];
    moves({
        verbose,
        square,
        piece,
    }: {
        verbose?: boolean;
        square?: Square;
        piece?: PieceSymbol;
    }): string[] | Move[];

    moves({ square, piece }: { square?: Square; piece?: PieceSymbol }): Move[];

    moves({
        verbose = false,
        square = undefined,
        piece = undefined,
    }: { verbose?: boolean; square?: Square; piece?: PieceSymbol } = {}) {
        const moves = this._moves({ square, piece });

        if (verbose) {
            return moves.map((move) => this._makePretty(move));
        } else {
            return moves.map((move) => this._moveToSan(move, moves));
        }
    }

    /**
     * Check if a square is occupied (including by whale's second square)
     */
    private _isSquareOccupied(square: number, color?: Color): boolean {
        // Check if piece is in _board
        if (this._board[square]) {
            if (color === undefined) return true;
            return this._board[square].color === color;
        }

        // Check if square is the second square of a whale
        if (this._kings.w[1] === square && this._kings.w[0] !== EMPTY) {
            if (color === undefined) return true;
            return color === WHITE;
        }
        if (this._kings.b[1] === square && this._kings.b[0] !== EMPTY) {
            if (color === undefined) return true;
            return color === BLACK;
        }

        return false;
    }

    /**
     * Generate whale moves - handles the complex 2-square spanning mechanic
     * Whale can either:
     * 1. Slide one half any distance in 8 directions while other half stays
     * 2. Rotate one half to adjacent orthogonal square
     * 3. Slide both halves together in parallel (maintaining orientation)
     */
    private _generateWhaleMoves(
        moves: InternalMove[],
        firstSq: number,
        secondSq: number,
        color: Color,
        them: Color,
    ) {
        // Only orthogonal directions for sliding (not diagonal)
        const slideOffsets = [-16, 1, 16, -1]; // up, right, down, left

        // Helper to add whale move
        // Calculate whaleOtherHalf for frontend display (where the other half will be after the move)
        const addWhaleMove = (
            from: number,
            to: number,
            stationarySq: number,
            captured?: PieceSymbol,
            capturedRole?: PieceRole,
        ) => {
            // Calculate where the OTHER half will be after this move
            // If moving from firstSq, the other half is at secondSq (or moves with it)
            // If moving from secondSq, the other half is at firstSq (or moves with it)
            const movingSquare = from;
            const offset = to - movingSquare;

            // Check if 'to' is adjacent to stationarySq (rotation)
            const toFile = to & 0xf;
            const toRank = to >> 4;
            const stationaryFile = stationarySq & 0xf;
            const stationaryRank = stationarySq >> 4;
            const fileDiff = Math.abs(toFile - stationaryFile);
            const rankDiff = Math.abs(toRank - stationaryRank);
            const isAdjacent =
                (fileDiff === 1 && rankDiff === 0) || (fileDiff === 0 && rankDiff === 1);

            // whaleOtherHalf is no longer needed - frontend calculates orientation from 'from' and 'to'

            const flags = captured ? BITS.CAPTURE : BITS.NORMAL;
            moves.push({
                color,
                from,
                to,
                piece: WHALE,
                captured,
                capturedRole,
                flags,
            });
        };

        // Helper to check if two squares are orthogonally adjacent
        const areOrthogonallyAdjacent = (sq1: number, sq2: number): boolean => {
            const fileDiff = Math.abs((sq1 & 0xf) - (sq2 & 0xf));
            const rankDiff = Math.abs((sq1 >> 4) - (sq2 >> 4));

            // Orthogonal = exactly one of file or rank differs by 1, the other is same
            return (fileDiff === 1 && rankDiff === 0) || (fileDiff === 0 && rankDiff === 1);
        };

        // TYPE 1: Slide FIRST half while SECOND half stays fixed
        for (const offset of slideOffsets) {
            let to = firstSq;
            while (true) {
                to += offset;
                if (to & 0x88) break; // Off board

                // Check if destination would overlap with second half
                if (to === secondSq) break;

                // CRITICAL: Whale must remain as 2 adjacent orthogonal squares
                if (!areOrthogonallyAdjacent(to, secondSq)) break;

                // Check if blocked by second half along the path
                // (whale cannot slide through its own other half)

                if (!this._isSquareOccupied(to)) {
                    // Empty square - can move
                    addWhaleMove(firstSq, to, secondSq);
                } else if (this._isSquareOccupied(to, them)) {
                    // Capture
                    const capturedType = this._board[to]?.type || WHALE;
                    const capturedRole = this._board[to]?.role;
                    addWhaleMove(firstSq, to, secondSq, capturedType, capturedRole);
                    break;
                } else {
                    // Own piece blocks
                    break;
                }
            }
        }

        // TYPE 2: Slide SECOND half while FIRST half stays fixed
        for (const offset of slideOffsets) {
            let to = secondSq;
            while (true) {
                to += offset;
                if (to & 0x88) break; // Off board

                // Check if destination would overlap with first half
                if (to === firstSq) break;

                // CRITICAL: Whale must remain as 2 adjacent orthogonal squares
                if (!areOrthogonallyAdjacent(to, firstSq)) break;

                if (!this._isSquareOccupied(to)) {
                    // Empty square - can move
                    addWhaleMove(secondSq, to, firstSq);
                } else if (this._isSquareOccupied(to, them)) {
                    // Capture
                    const capturedType = this._board[to]?.type || WHALE;
                    const capturedRole = this._board[to]?.role;
                    addWhaleMove(secondSq, to, firstSq, capturedType, capturedRole);
                    break;
                } else {
                    // Own piece blocks
                    break;
                }
            }
        }

        // TYPE 3: Parallel sliding - both halves move together in the same direction
        // Whale can slide in any orthogonal direction (up/down/left/right) maintaining orientation
        const parallelOffsets = [-16, 16, -1, 1]; // up, down, left, right

        for (const offset of parallelOffsets) {
            let dist = 1;
            while (true) {
                const newFirst = firstSq + offset * dist;
                const newSecond = secondSq + offset * dist;

                // Check if either square goes off board
                if (newFirst & 0x88 || newSecond & 0x88) {
                    break;
                }

                // For horizontal moves (offset ±1), check if we wrapped to another rank
                if (Math.abs(offset) === 1) {
                    if (newFirst >> 4 !== firstSq >> 4 || newSecond >> 4 !== secondSq >> 4) {
                        break;
                    }
                }

                // Check if the two squares are still orthogonally adjacent after the move
                if (!areOrthogonallyAdjacent(newFirst, newSecond)) {
                    break;
                }

                // Check occupancy (excluding the whale's current squares)
                const firstBlocked =
                    this._isSquareOccupied(newFirst) &&
                    newFirst !== firstSq &&
                    newFirst !== secondSq;
                const secondBlocked =
                    this._isSquareOccupied(newSecond) &&
                    newSecond !== firstSq &&
                    newSecond !== secondSq;

                // Both must be empty to slide through
                if (!firstBlocked && !secondBlocked) {
                    // Generate moves from BOTH starting squares for parallel sliding
                    // (since clicking either square should show this option)
                    addWhaleMove(firstSq, newFirst, newSecond);
                    addWhaleMove(secondSq, newSecond, newFirst);
                    dist++;
                } else {
                    // Check for captures (can capture with one or both squares)
                    const firstCapture = this._isSquareOccupied(newFirst, them);
                    const secondCapture = this._isSquareOccupied(newSecond, them);

                    if (
                        (firstCapture || !firstBlocked) &&
                        (secondCapture || !secondBlocked) &&
                        (firstCapture || secondCapture)
                    ) {
                        // At least one capture, other square empty or capturable
                        const capturedType =
                            this._board[newFirst]?.type || this._board[newSecond]?.type || WHALE;
                        const capturedRole =
                            this._board[newFirst]?.role || this._board[newSecond]?.role;
                        // Generate captures from BOTH starting squares
                        addWhaleMove(firstSq, newFirst, newSecond, capturedType, capturedRole);
                        addWhaleMove(secondSq, newSecond, newFirst, capturedType, capturedRole);
                    }
                    break;
                }
            }
        }

        // TYPE 4: Rotation moves - one half moves to any square adjacent to the stationary half
        // The key insight: we try all 4 orthogonal squares adjacent to the stationary half,
        // not just orthogonal moves of the moving half
        const orthogonalOffsets = [-16, 1, 16, -1]; // up, right, down, left

        // Rotate FIRST half around SECOND half (second stays fixed)
        // Try all squares adjacent to secondSq (the stationary half)
        for (const offset of orthogonalOffsets) {
            const to = secondSq + offset; // Square adjacent to stationary half
            if (to & 0x88) continue; // Off board
            if (to === firstSq) continue; // Already occupied by the moving half

            // The result is always valid: 'to' is adjacent to secondSq by construction
            // (we're iterating through orthogonal offsets from secondSq)

            // Check if square is empty or capturable
            if (!this._isSquareOccupied(to)) {
                addWhaleMove(firstSq, to, secondSq);
            } else if (this._isSquareOccupied(to, them)) {
                const capturedType = this._board[to]?.type || WHALE;
                const capturedRole = this._board[to]?.role;
                addWhaleMove(firstSq, to, secondSq, capturedType, capturedRole);
            }
        }

        // Rotate SECOND half around FIRST half (first stays fixed)
        // Try all squares adjacent to firstSq (the stationary half)
        for (const offset of orthogonalOffsets) {
            const to = firstSq + offset; // Square adjacent to stationary half
            if (to & 0x88) continue; // Off board
            if (to === secondSq) continue; // Already occupied by the moving half

            // The result is always valid: 'to' is adjacent to firstSq by construction
            // (we're iterating through orthogonal offsets from firstSq)

            // Check if square is empty or capturable
            if (!this._isSquareOccupied(to)) {
                addWhaleMove(secondSq, to, firstSq);
            } else if (this._isSquareOccupied(to, them)) {
                const capturedType = this._board[to]?.type || WHALE;
                const capturedRole = this._board[to]?.role;
                addWhaleMove(secondSq, to, firstSq, capturedType, capturedRole);
            }
        }
    }

    private _moves({
        legal = true,
        piece = undefined,
        square = undefined,
    }: {
        legal?: boolean;
        piece?: PieceSymbol;
        square?: Square;
    } = {}) {
        const forSquare = square ? (square.toLowerCase() as Square) : undefined;
        const forPiece = piece?.toLowerCase();

        const moves: InternalMove[] = [];
        const us = this._turn;
        const them = swapColor(us);

        let firstSquare = Ox88.a8;
        let lastSquare = Ox88.h1;
        let singleSquare = false;

        // are we generating moves for a single square?
        if (forSquare) {
            // illegal square, return empty moves
            if (!(forSquare in Ox88)) {
                return [];
            } else {
                const targetSq = Ox88[forSquare];

                // Whale piece is now stored at both squares, so just use the target square
                firstSquare = lastSquare = targetSq;
                singleSquare = true;
            }
        }

        for (let from = firstSquare; from <= lastSquare; from++) {
            // did we run off the end of the board
            if (from & 0x88) {
                from += 7;
                continue;
            }

            // empty square or opponent, skip
            if (!this._board[from] || this._board[from].color === them) {
                continue;
            }
            const { type } = this._board[from];

            let to: number;
            if (type === CRAB) {
                // Crabs move 1 square orthogonally (no double moves, no en passant in Coral Clash)
                if (forPiece && forPiece !== type) continue;

                for (let j = 0; j < CRAB_OFFSETS.length; j++) {
                    to = from + CRAB_OFFSETS[j];
                    if (to & 0x88) continue;

                    if (!this._isSquareOccupied(to)) {
                        // Empty square - crab can move there
                        addMove(moves, us, from, to, CRAB);
                    } else if (this._isSquareOccupied(to, them)) {
                        // Capture opponent's piece
                        const capturedType = this._board[to]?.type || WHALE; // Could be whale
                        const capturedRole = this._board[to]?.role; // Preserve role for Coral Clash
                        addMove(
                            moves,
                            us,
                            from,
                            to,
                            CRAB,
                            capturedType,
                            BITS.CAPTURE,
                            capturedRole,
                        );
                    }
                }
            } else if (type === WHALE) {
                // Whale - special 2-square piece with unique movement
                if (forPiece && forPiece !== type) continue;

                // Get both squares the whale occupies
                const [firstSq, secondSq] = this._kings[us];

                // Generate all whale moves (only once, even though piece is at both squares)
                // Check if this is the first occurrence to avoid duplicates
                if (from === firstSq) {
                    this._generateWhaleMoves(moves, firstSq, secondSq, us, them);
                }
            } else {
                if (forPiece && forPiece !== type) continue;

                for (let j = 0, len = PIECE_OFFSETS[type].length; j < len; j++) {
                    const offset = PIECE_OFFSETS[type][j];
                    to = from;

                    while (true) {
                        to += offset;
                        if (to & 0x88) break;

                        if (!this._isSquareOccupied(to)) {
                            addMove(moves, us, from, to, type);
                        } else {
                            // own color, stop loop
                            if (this._isSquareOccupied(to, us)) break;

                            // Capture opponent's piece
                            // Get the piece type - if not in _board, must be opponent whale's second square
                            let capturedType: PieceSymbol;
                            if (this._board[to]) {
                                capturedType = this._board[to].type;
                            } else {
                                // Square is occupied but not in _board = must be whale's second square
                                capturedType = WHALE;
                            }

                            const capturedRole = this._board[to]?.role;
                            addMove(
                                moves,
                                us,
                                from,
                                to,
                                type,
                                capturedType,
                                BITS.CAPTURE,
                                capturedRole,
                            );
                            break;
                        }

                        /* break, if octopus (moves 1 square) */
                        if (type === OCTOPUS) break;
                    }
                }
            }
        }

        // No castling in Coral Clash

        /*
         * return all pseudo-legal moves (this includes moves that allow the king
         * to be captured)
         */
        if (!legal || this._kings[us][0] === -1) {
            return moves;
        }

        // filter out illegal moves
        const legalMoves = [];

        for (let i = 0, len = moves.length; i < len; i++) {
            this._makeMove(moves[i]);
            if (!this._isKingAttacked(us)) {
                legalMoves.push(moves[i]);
            }
            this._undoMove();
        }

        return legalMoves;
    }

    move(
        move: string | { from: string; to: string; promotion?: string },
        { strict = false }: { strict?: boolean } = {},
    ) {
        /*
         * The move function can be called with in the following parameters:
         *
         * .move('Nxb7')       <- argument is a case-sensitive SAN string
         *
         * .move({ from: 'h7', <- argument is a move object
         *         to :'h8',
         *         promotion: 'q' })
         *
         *
         * An optional strict argument may be supplied to tell chess.js to
         * strictly follow the SAN specification.
         */

        let moveObj = null;

        if (typeof move === 'string') {
            moveObj = this._moveFromSan(move, strict);
        } else if (typeof move === 'object') {
            const moves = this._moves();

            // convert the pretty move object to an ugly move object
            for (let i = 0, len = moves.length; i < len; i++) {
                if (
                    move.from === algebraic(moves[i].from) &&
                    move.to === algebraic(moves[i].to) &&
                    (!('promotion' in moves[i]) || move.promotion === moves[i].promotion)
                ) {
                    moveObj = moves[i];
                    break;
                }
            }
        }

        // failed to find move
        if (!moveObj) {
            if (typeof move === 'string') {
                throw new Error(`Invalid move: ${move}`);
            } else {
                throw new Error(`Invalid move: ${JSON.stringify(move)}`);
            }
        }

        /*
         * need to make a copy of move because we can't generate SAN after the move
         * is made
         */
        const prettyMove = this._makePretty(moveObj);

        this._makeMove(moveObj);
        this._incPositionCount(prettyMove.after);
        return prettyMove;
    }

    private _push(move: InternalMove) {
        this._history.push({
            move,
            kings: {
                b: [this._kings.b[0], this._kings.b[1]],
                w: [this._kings.w[0], this._kings.w[1]],
            },
            turn: this._turn,
            epSquare: this._epSquare,
            halfMoves: this._halfMoves,
            moveNumber: this._moveNumber,
            // Save coral state for undo
            coral: [...this._coral],
            coralRemaining: { b: this._coralRemaining.b, w: this._coralRemaining.w },
        });
    }

    private _makeMove(move: InternalMove) {
        const us = this._turn;
        const them = swapColor(us);
        this._push(move);

        // Whale should NEVER be captured - game ends at checkmate first
        // If this happens, it indicates a bug in move generation or validation
        if (move.captured === WHALE) {
            console.error('[_makeMove] ILLEGAL: Whale capture attempted!', {
                from: algebraic(move.from),
                to: algebraic(move.to),
                piece: move.piece,
                turn: us,
                captured: move.captured,
            });
            console.error('This should never happen in normal play. Game should end at checkmate.');
        }

        // Move piece in _board
        // For whale: piece is stored at BOTH squares it occupies
        if (move.piece === WHALE) {
            // Whale move: Remove piece from both old squares
            const [oldFirst, oldSecond] = this._kings[us];

            // Always use a clean whale piece (don't trust stored data which might be corrupted)
            const whalePiece: Piece = {
                type: WHALE,
                color: us,
                role: undefined,
            };

            // Determine the other square's position after the move
            // Check if this is a parallel slide (both halves move same offset) or rotation (one stays fixed)
            const movingSquare = move.from;
            const stationarySquare = movingSquare === oldFirst ? oldSecond : oldFirst;
            const offset = move.to - movingSquare;

            // Check if the move is orthogonally adjacent to stationary square
            // If yes, it's a rotation (stationary stays fixed)
            // If no, it's a parallel slide or single-half slide
            const toFile = move.to & 0xf;
            const toRank = move.to >> 4;
            const stationaryFile = stationarySquare & 0xf;
            const stationaryRank = stationarySquare >> 4;
            const fileDiff = Math.abs(toFile - stationaryFile);
            const rankDiff = Math.abs(toRank - stationaryRank);
            const isAdjacent =
                (fileDiff === 1 && rankDiff === 0) || (fileDiff === 0 && rankDiff === 1);

            const newOtherSquare = isAdjacent ? stationarySquare : stationarySquare + offset;

            // Delete whale from its single storage position (always at oldFirst)
            delete this._board[oldFirst];
            if (this._board[oldSecond]) {
                delete this._board[oldSecond]; // Cleanup in case of old bugs
            }

            // Store whale at ONLY the first position (simpler!)
            // Determine which square should be "first" (we'll use the leftmost/bottommost)
            const newFirst = move.to < newOtherSquare ? move.to : newOtherSquare;
            const newSecond = move.to < newOtherSquare ? newOtherSquare : move.to;

            this._board[newFirst] = { ...whalePiece };

            // Update whale positions
            this._kings[us] = [newFirst, newSecond];
        } else {
            // Normal piece move
            this._board[move.to] = this._board[move.from];
            delete this._board[move.from];
        }

        // if ep capture, remove the captured pawn
        if (move.flags & BITS.EP_CAPTURE) {
            if (this._turn === BLACK) {
                delete this._board[move.to - 16];
            } else {
                delete this._board[move.to + 16];
            }
        }

        // if pawn promotion, replace with new piece
        if (move.promotion) {
            // Preserve the role (hunter/gatherer) from the original piece
            const originalPiece = this._board[move.to];
            this._board[move.to] = {
                type: move.promotion,
                color: us,
                role: originalPiece?.role, // Preserve gatherer/hunter status in Coral Clash
            };
        }

        // No castling logic in Coral Clash

        // reset the 50 move counter if a crab is moved or a piece is captured
        if (move.piece === CRAB) {
            this._halfMoves = 0;
        } else if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
            this._halfMoves = 0;
        } else {
            this._halfMoves++;
        }

        if (us === BLACK) {
            this._moveNumber++;
        }

        this._turn = them;
    }

    undo() {
        const move = this._undoMove();
        if (move) {
            const prettyMove = this._makePretty(move);
            this._decPositionCount(prettyMove.after);
            return prettyMove;
        }
        return null;
    }

    private _undoMove() {
        const old = this._history.pop();
        if (old === undefined) {
            return null;
        }

        const move = old.move;

        const us = old.turn; // Use old.turn, not this._turn (which hasn't been restored yet)
        const them = swapColor(us);

        // Special handling for whale moves - save current position BEFORE restoring history
        let whaleCurrentPositions: [number, number] | null = null;
        if (move.piece === WHALE) {
            // Save where the whale is NOW (before we restore history)
            whaleCurrentPositions = [this._kings[us][0], this._kings[us][1]];
        }

        // CRITICAL: Create COPIES, not references, to avoid corrupting history
        this._kings = {
            b: [old.kings.b[0], old.kings.b[1]],
            w: [old.kings.w[0], old.kings.w[1]],
        };
        this._turn = old.turn;
        this._epSquare = old.epSquare;
        this._halfMoves = old.halfMoves;
        this._moveNumber = old.moveNumber;
        // Restore coral state (create copies to avoid reference issues)
        this._coral = [...old.coral];
        this._coralRemaining = { b: old.coralRemaining.b, w: old.coralRemaining.w };

        // Special handling for whale moves - whale is stored at both positions
        if (move.piece === WHALE && whaleCurrentPositions) {
            // This is a whale move - restore whale to both old positions
            // old.kings[us] tells us where the whale WAS before the move (both squares)
            const [oldFirst, oldSecond] = old.kings[us];

            // Get the piece object from the CURRENT positions (saved before history restore)
            const [currentFirst, currentSecond] = whaleCurrentPositions;
            const whalePiece = this._board[currentFirst] ||
                this._board[currentSecond] || {
                    type: WHALE,
                    color: us,
                    role: undefined,
                };

            // Delete whale from current storage position
            delete this._board[currentFirst];
            if (this._board[currentSecond]) {
                delete this._board[currentSecond]; // Cleanup in case of old bugs
            }

            // Restore whale to only the first old position
            this._board[oldFirst] = { ...whalePiece };

            // Fix type in case of promotion
            if (this._board[oldFirst]) {
                this._board[oldFirst].type = move.piece;
            }
        } else {
            // Normal piece move
            this._board[move.from] = this._board[move.to];
            if (this._board[move.from]) {
                this._board[move.from].type = move.piece; // to undo any promotions
            }
            delete this._board[move.to];
        }

        if (move.captured) {
            if (move.flags & BITS.EP_CAPTURE) {
                // en passant capture
                let index: number;
                if (us === BLACK) {
                    index = move.to - 16;
                } else {
                    index = move.to + 16;
                }
                this._board[index] = { type: CRAB, color: them, role: move.capturedRole };
            } else if (move.captured === WHALE) {
                // Whale capture should never happen in normal play
                console.error('[_undoMove] Undoing illegal whale capture');
            } else {
                // regular capture - restore with role
                this._board[move.to] = {
                    type: move.captured,
                    color: them,
                    role: move.capturedRole,
                };
            }
        }

        // No castling in Coral Clash

        return move;
    }

    pgn({ newline = '\n', maxWidth = 0 }: { newline?: string; maxWidth?: number } = {}) {
        /*
         * using the specification from http://www.chessclub.com/help/PGN-spec
         * example for html usage: .pgn({ max_width: 72, newline_char: "<br />" })
         */

        const result: string[] = [];
        let headerExists = false;

        /* add the PGN header information */
        for (const i in this._header) {
            /*
             * TODO: order of enumerated properties in header object is not
             * guaranteed, see ECMA-262 spec (section 12.6.4)
             */
            result.push('[' + i + ' "' + this._header[i] + '"]' + newline);
            headerExists = true;
        }

        if (headerExists && this._history.length) {
            result.push(newline);
        }

        const appendComment = (moveString: string) => {
            const comment = this._comments[this.fen()];
            if (typeof comment !== 'undefined') {
                const delimiter = moveString.length > 0 ? ' ' : '';
                moveString = `${moveString}${delimiter}{${comment}}`;
            }
            return moveString;
        };

        // pop all of history onto reversed_history
        const reversedHistory = [];
        while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
        }

        const moves = [];
        let moveString = '';

        // special case of a commented starting position with no moves
        if (reversedHistory.length === 0) {
            moves.push(appendComment(''));
        }

        // build the list of moves.  a move_string looks like: "3. e3 e6"
        while (reversedHistory.length > 0) {
            moveString = appendComment(moveString);
            const move = reversedHistory.pop();

            // make TypeScript stop complaining about move being undefined
            if (!move) {
                break;
            }

            // if the position started with black to move, start PGN with #. ...
            if (!this._history.length && move.color === 'b') {
                const prefix = `${this._moveNumber}. ...`;
                // is there a comment preceding the first move?
                moveString = moveString ? `${moveString} ${prefix}` : prefix;
            } else if (move.color === 'w') {
                // store the previous generated move_string if we have one
                if (moveString.length) {
                    moves.push(moveString);
                }
                moveString = this._moveNumber + '.';
            }

            moveString = moveString + ' ' + this._moveToSan(move, this._moves({ legal: true }));
            this._makeMove(move);
        }

        // are there any other leftover moves?
        if (moveString.length) {
            moves.push(appendComment(moveString));
        }

        // is there a result?
        if (typeof this._header.Result !== 'undefined') {
            moves.push(this._header.Result);
        }

        /*
         * history should be back to what it was before we started generating PGN,
         * so join together moves
         */
        if (maxWidth === 0) {
            return result.join('') + moves.join(' ');
        }

        // TODO (jah): huh?
        const strip = function () {
            if (result.length > 0 && result[result.length - 1] === ' ') {
                result.pop();
                return true;
            }
            return false;
        };

        // NB: this does not preserve comment whitespace.
        const wrapComment = function (width: number, move: string) {
            for (const token of move.split(' ')) {
                if (!token) {
                    continue;
                }
                if (width + token.length > maxWidth) {
                    while (strip()) {
                        width--;
                    }
                    result.push(newline);
                    width = 0;
                }
                result.push(token);
                width += token.length;
                result.push(' ');
                width++;
            }
            if (strip()) {
                width--;
            }
            return width;
        };

        // wrap the PGN output at max_width
        let currentWidth = 0;
        for (let i = 0; i < moves.length; i++) {
            if (currentWidth + moves[i].length > maxWidth) {
                if (moves[i].includes('{')) {
                    currentWidth = wrapComment(currentWidth, moves[i]);
                    continue;
                }
            }
            // if the current move will push past max_width
            if (currentWidth + moves[i].length > maxWidth && i !== 0) {
                // don't end the line with whitespace
                if (result[result.length - 1] === ' ') {
                    result.pop();
                }

                result.push(newline);
                currentWidth = 0;
            } else if (i !== 0) {
                result.push(' ');
                currentWidth++;
            }
            result.push(moves[i]);
            currentWidth += moves[i].length;
        }

        return result.join('');
    }

    header(...args: string[]) {
        for (let i = 0; i < args.length; i += 2) {
            if (typeof args[i] === 'string' && typeof args[i + 1] === 'string') {
                this._header[args[i]] = args[i + 1];
            }
        }
        return this._header;
    }

    loadPgn(
        pgn: string,
        { strict = false, newlineChar = '\r?\n' }: { strict?: boolean; newlineChar?: string } = {},
    ) {
        function mask(str: string): string {
            return str.replace(/\\/g, '\\');
        }

        function parsePgnHeader(header: string): { [key: string]: string } {
            const headerObj: Record<string, string> = {};
            const headers = header.split(new RegExp(mask(newlineChar)));
            let key = '';
            let value = '';

            for (let i = 0; i < headers.length; i++) {
                const regex = /^\s*\[\s*([A-Za-z]+)\s*"(.*)"\s*\]\s*$/;
                key = headers[i].replace(regex, '$1');
                value = headers[i].replace(regex, '$2');
                if (key.trim().length > 0) {
                    headerObj[key] = value;
                }
            }

            return headerObj;
        }

        // strip whitespace from head/tail of PGN block
        pgn = pgn.trim();

        /*
         * RegExp to split header. Takes advantage of the fact that header and movetext
         * will always have a blank line between them (ie, two newline_char's). Handles
         * case where movetext is empty by matching newlineChar until end of string is
         * matched - effectively trimming from the end extra newlineChar.
         *
         * With default newline_char, will equal:
         * /^(\[((?:\r?\n)|.)*\])((?:\s*\r?\n){2}|(?:\s*\r?\n)*$)/
         */
        const headerRegex = new RegExp(
            '^(\\[((?:' +
                mask(newlineChar) +
                ')|.)*\\])' +
                '((?:\\s*' +
                mask(newlineChar) +
                '){2}|(?:\\s*' +
                mask(newlineChar) +
                ')*$)',
        );

        // If no header given, begin with moves.
        const headerRegexResults = headerRegex.exec(pgn);
        const headerString = headerRegexResults
            ? headerRegexResults.length >= 2
                ? headerRegexResults[1]
                : ''
            : '';

        // Put the board in the starting position
        this.reset();

        // parse PGN header
        const headers = parsePgnHeader(headerString);
        let fen = '';

        for (const key in headers) {
            // check to see user is including fen (possibly with wrong tag case)
            if (key.toLowerCase() === 'fen') {
                fen = headers[key];
            }

            this.header(key, headers[key]);
        }

        /*
         * the permissive parser should attempt to load a fen tag, even if it's the
         * wrong case and doesn't include a corresponding [SetUp "1"] tag
         */
        if (!strict) {
            if (fen) {
                this.load(fen, { preserveHeaders: true });
            }
        } else {
            /*
             * strict parser - load the starting position indicated by [Setup '1']
             * and [FEN position]
             */
            if (headers['SetUp'] === '1') {
                if (!('FEN' in headers)) {
                    throw new Error('Invalid PGN: FEN tag must be supplied with SetUp tag');
                }
                // don't clear the headers when loading
                this.load(headers['FEN'], { preserveHeaders: true });
            }
        }

        /*
         * NB: the regexes below that delete move numbers, recursive annotations,
         * and numeric annotation glyphs may also match text in comments. To
         * prevent this, we transform comments by hex-encoding them in place and
         * decoding them again after the other tokens have been deleted.
         *
         * While the spec states that PGN files should be ASCII encoded, we use
         * {en,de}codeURIComponent here to support arbitrary UTF8 as a convenience
         * for modern users
         */

        function toHex(s: string): string {
            return Array.from(s)
                .map(function (c) {
                    /*
                     * encodeURI doesn't transform most ASCII characters, so we handle
                     * these ourselves
                     */
                    return c.charCodeAt(0) < 128
                        ? c.charCodeAt(0).toString(16)
                        : encodeURIComponent(c).replace(/%/g, '').toLowerCase();
                })
                .join('');
        }

        function fromHex(s: string): string {
            return s.length == 0
                ? ''
                : decodeURIComponent('%' + (s.match(/.{1,2}/g) || []).join('%'));
        }

        const encodeComment = function (s: string) {
            s = s.replace(new RegExp(mask(newlineChar), 'g'), ' ');
            return `{${toHex(s.slice(1, s.length - 1))}}`;
        };

        const decodeComment = function (s: string) {
            if (s.startsWith('{') && s.endsWith('}')) {
                return fromHex(s.slice(1, s.length - 1));
            }
        };

        // delete header to get the moves
        let ms = pgn
            .replace(headerString, '')
            .replace(
                // encode comments so they don't get deleted below
                new RegExp(`({[^}]*})+?|;([^${mask(newlineChar)}]*)`, 'g'),
                function (_match, bracket, semicolon) {
                    return bracket !== undefined
                        ? encodeComment(bracket)
                        : ' ' + encodeComment(`{${semicolon.slice(1)}}`);
                },
            )
            .replace(new RegExp(mask(newlineChar), 'g'), ' ');

        // delete recursive annotation variations
        const ravRegex = /(\([^()]+\))+?/g;
        while (ravRegex.test(ms)) {
            ms = ms.replace(ravRegex, '');
        }

        // delete move numbers
        ms = ms.replace(/\d+\.(\.\.)?/g, '');

        // delete ... indicating black to move
        ms = ms.replace(/\.\.\./g, '');

        /* delete numeric annotation glyphs */
        ms = ms.replace(/\$\d+/g, '');

        // trim and get array of moves
        let moves = ms.trim().split(new RegExp(/\s+/));

        // delete empty entries
        moves = moves.filter((move) => move !== '');

        let result = '';

        for (let halfMove = 0; halfMove < moves.length; halfMove++) {
            const comment = decodeComment(moves[halfMove]);
            if (comment !== undefined) {
                this._comments[this.fen()] = comment;
                continue;
            }

            const move = this._moveFromSan(moves[halfMove], strict);

            // invalid move
            if (move == null) {
                // was the move an end of game marker
                if (TERMINATION_MARKERS.indexOf(moves[halfMove]) > -1) {
                    result = moves[halfMove];
                } else {
                    throw new Error(`Invalid move in PGN: ${moves[halfMove]}`);
                }
            } else {
                // reset the end of game marker if making a valid move
                result = '';
                this._makeMove(move);
                this._incPositionCount(this.fen());
            }
        }

        /*
         * Per section 8.2.6 of the PGN spec, the Result tag pair must match match
         * the termination marker. Only do this when headers are present, but the
         * result tag is missing
         */

        if (result && Object.keys(this._header).length && !this._header['Result']) {
            this.header('Result', result);
        }
    }

    /*
     * Convert a move from 0x88 coordinates to Standard Algebraic Notation
     * (SAN)
     *
     * @param {boolean} strict Use the strict SAN parser. It will throw errors
     * on overly disambiguated moves (see below):
     *
     * r1bqkbnr/ppp2ppp/2n5/1B1pP3/4P3/8/PPPP2PP/RNBQK1NR b KQkq - 2 4
     * 4. ... Nge7 is overly disambiguated because the knight on c6 is pinned
     * 4. ... Ne7 is technically the valid SAN
     */

    private _moveToSan(move: InternalMove, moves: InternalMove[]) {
        let output = '';

        // No castling in Coral Clash
        if (move.piece !== CRAB) {
            const disambiguator = getDisambiguator(move, moves);
            output += move.piece.toUpperCase() + disambiguator;
        }

        if (move.flags & (BITS.CAPTURE | BITS.EP_CAPTURE)) {
            if (move.piece === CRAB) {
                output += algebraic(move.from)[0];
            }
            output += 'x';
        }

        output += algebraic(move.to);

        if (move.promotion) {
            output += '=' + move.promotion.toUpperCase();
        }

        this._makeMove(move);
        if (this.isCheck()) {
            if (this.isCheckmate()) {
                output += '#';
            } else {
                output += '+';
            }
        }
        this._undoMove();

        return output;
    }

    // convert a move from Standard Algebraic Notation (SAN) to 0x88 coordinates
    private _moveFromSan(move: string, strict = false): InternalMove | null {
        // strip off any move decorations: e.g Nf3+?! becomes Nf3
        const cleanMove = strippedSan(move);

        let pieceType = inferPieceType(cleanMove);
        let moves = this._moves({ legal: true, piece: pieceType });

        // strict parser
        for (let i = 0, len = moves.length; i < len; i++) {
            if (cleanMove === strippedSan(this._moveToSan(moves[i], moves))) {
                return moves[i];
            }
        }

        // the strict parser failed
        if (strict) {
            return null;
        }

        let piece = undefined;
        let matches = undefined;
        let from = undefined;
        let to = undefined;
        let promotion = undefined;

        /*
         * The default permissive (non-strict) parser allows the user to parse
         * non-standard chess notations. This parser is only run after the strict
         * Standard Algebraic Notation (SAN) parser has failed.
         *
         * When running the permissive parser, we'll run a regex to grab the piece, the
         * to/from square, and an optional promotion piece. This regex will
         * parse common non-standard notation like: Pe2-e4, Rc1c4, Qf3xf7,
         * f7f8q, b1c3
         *
         * NOTE: Some positions and moves may be ambiguous when using the permissive
         * parser. For example, in this position: 6k1/8/8/B7/8/8/8/BN4K1 w - - 0 1,
         * the move b1c3 may be interpreted as Nc3 or B1c3 (a disambiguated bishop
         * move). In these cases, the permissive parser will default to the most
         * basic interpretation (which is b1c3 parsing to Nc3).
         */

        let overlyDisambiguated = false;

        matches = cleanMove.match(
            /([pnbrqkPNBRQK])?([a-h][1-8])x?-?([a-h][1-8])([qrbnQRBN])?/,
            //     piece         from              to       promotion
        );

        if (matches) {
            piece = matches[1];
            from = matches[2] as Square;
            to = matches[3] as Square;
            promotion = matches[4];

            if (from.length == 1) {
                overlyDisambiguated = true;
            }
        } else {
            /*
             * The [a-h]?[1-8]? portion of the regex below handles moves that may be
             * overly disambiguated (e.g. Nge7 is unnecessary and non-standard when
             * there is one legal knight move to e7). In this case, the value of
             * 'from' variable will be a rank or file, not a square.
             */

            matches = cleanMove.match(
                /([pnbrqkPNBRQK])?([a-h]?[1-8]?)x?-?([a-h][1-8])([qrbnQRBN])?/,
            );

            if (matches) {
                piece = matches[1];
                from = matches[2] as Square;
                to = matches[3] as Square;
                promotion = matches[4];

                if (from.length == 1) {
                    overlyDisambiguated = true;
                }
            }
        }

        pieceType = inferPieceType(cleanMove);
        moves = this._moves({
            legal: true,
            piece: piece ? (piece as PieceSymbol) : pieceType,
        });

        if (!to) {
            return null;
        }

        for (let i = 0, len = moves.length; i < len; i++) {
            if (!from) {
                // if there is no from square, it could be just 'x' missing from a capture
                if (cleanMove === strippedSan(this._moveToSan(moves[i], moves)).replace('x', '')) {
                    return moves[i];
                }
                // hand-compare move properties with the results from our permissive regex
            } else if (
                (!piece || piece.toLowerCase() == moves[i].piece) &&
                Ox88[from] == moves[i].from &&
                Ox88[to] == moves[i].to &&
                (!promotion || promotion.toLowerCase() == moves[i].promotion)
            ) {
                return moves[i];
            } else if (overlyDisambiguated) {
                /*
                 * SPECIAL CASE: we parsed a move string that may have an unneeded
                 * rank/file disambiguator (e.g. Nge7).  The 'from' variable will
                 */

                const square = algebraic(moves[i].from);
                if (
                    (!piece || piece.toLowerCase() == moves[i].piece) &&
                    Ox88[to] == moves[i].to &&
                    (from == square[0] || from == square[1]) &&
                    (!promotion || promotion.toLowerCase() == moves[i].promotion)
                ) {
                    return moves[i];
                }
            }
        }

        return null;
    }

    ascii() {
        let s = '   +------------------------+\n';
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            // display the rank
            if (file(i) === 0) {
                s += ' ' + '87654321'[rank(i)] + ' |';
            }

            if (this._board[i]) {
                const piece = this._board[i].type;
                const color = this._board[i].color;
                const symbol = color === WHITE ? piece.toUpperCase() : piece.toLowerCase();
                s += ' ' + symbol + ' ';
            } else {
                s += ' . ';
            }

            if ((i + 1) & 0x88) {
                s += '|\n';
                i += 8;
            }
        }
        s += '   +------------------------+\n';
        s += '     a  b  c  d  e  f  g  h';

        return s;
    }

    perft(depth: number) {
        const moves = this._moves({ legal: false });
        let nodes = 0;
        const color = this._turn;

        for (let i = 0, len = moves.length; i < len; i++) {
            this._makeMove(moves[i]);
            if (!this._isKingAttacked(color)) {
                if (depth - 1 > 0) {
                    nodes += this.perft(depth - 1);
                } else {
                    nodes++;
                }
            }
            this._undoMove();
        }

        return nodes;
    }

    // pretty = external move object
    private _makePretty(uglyMove: InternalMove): Move {
        const { color, piece, from, to, flags, captured, promotion } = uglyMove;

        let prettyFlags = '';

        for (const flag in BITS) {
            if (BITS[flag] & flags) {
                prettyFlags += FLAGS[flag];
            }
        }

        const fromAlgebraic = algebraic(from);
        const toAlgebraic = algebraic(to);

        const move: Move = {
            color,
            piece,
            from: fromAlgebraic,
            to: toAlgebraic,
            san: this._moveToSan(uglyMove, this._moves({ legal: true })),
            flags: prettyFlags,
            lan: fromAlgebraic + toAlgebraic,
            before: this.fen(),
            after: '',
        };

        // generate the FEN for the 'after' key and calculate whale positions
        this._makeMove(uglyMove);
        move.after = this.fen();

        // If this is a whale move, add whale-specific metadata
        if (piece === WHALE) {
            const [firstSq, secondSq] = this._kings[color];
            const firstSquare = algebraic(firstSq);
            const secondSquare = algebraic(secondSq);

            // Determine which square is NOT the 'to' square - that's the other half
            move.whaleSecondSquare = toAlgebraic === firstSquare ? secondSquare : firstSquare;

            // Determine orientation based on squares
            const toFile = toAlgebraic.charCodeAt(0);
            const toRank = parseInt(toAlgebraic[1]);
            const secondFile = move.whaleSecondSquare.charCodeAt(0);
            const secondRank = parseInt(move.whaleSecondSquare[1]);

            move.whaleOrientation = toRank === secondRank ? 'horizontal' : 'vertical';
        }

        this._undoMove();

        if (captured) {
            move.captured = captured;
        }
        if (promotion) {
            move.promotion = promotion;
            move.lan += promotion;
        }

        return move;
    }

    turn() {
        return this._turn;
    }

    board() {
        const output = [];
        let row = [];

        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            // Check if this square has a piece in _board
            if (this._board[i]) {
                row.push({
                    square: algebraic(i),
                    type: this._board[i].type,
                    color: this._board[i].color,
                    role: this._board[i].role,
                });
            } else {
                // Check if this is the SECOND square of a whale (not stored in _board)
                let isWhaleSecondSquare = false;
                let whaleColor: Color | null = null;

                // Check white whale's second square
                if (this._kings.w[1] === i && this._kings.w[0] !== EMPTY) {
                    isWhaleSecondSquare = true;
                    whaleColor = WHITE;
                }
                // Check black whale's second square
                else if (this._kings.b[1] === i && this._kings.b[0] !== EMPTY) {
                    isWhaleSecondSquare = true;
                    whaleColor = BLACK;
                }

                if (isWhaleSecondSquare && whaleColor) {
                    // Show the whale at its second square too
                    row.push({
                        square: algebraic(i),
                        type: WHALE,
                        color: whaleColor,
                        role: undefined, // Whale has no role
                    });
                } else {
                    row.push(null);
                }
            }

            if ((i + 1) & 0x88) {
                output.push(row);
                row = [];
                i += 8;
            }
        }

        return output;
    }

    squareColor(square: Square) {
        if (square in Ox88) {
            const sq = Ox88[square];
            return (rank(sq) + file(sq)) % 2 === 0 ? 'light' : 'dark';
        }

        return null;
    }

    history(): string[];
    history({ verbose }: { verbose: true }): Move[];
    history({ verbose }: { verbose: false }): string[];
    history({ verbose }: { verbose: boolean }): string[] | Move[];
    history({ verbose = false }: { verbose?: boolean } = {}) {
        const reversedHistory = [];
        const moveHistory = [];

        while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
        }

        while (true) {
            const move = reversedHistory.pop();
            if (!move) {
                break;
            }

            if (verbose) {
                moveHistory.push(this._makePretty(move));
            } else {
                moveHistory.push(this._moveToSan(move, this._moves()));
            }
            this._makeMove(move);
        }

        return moveHistory;
    }

    /*
     * Keeps track of position occurrence counts for the purpose of repetition
     * checking. All three methods (`_inc`, `_dec`, and `_get`) trim the
     * irrelevent information from the fen, initialising new positions, and
     * removing old positions from the record if their counts are reduced to 0.
     */
    private _getPositionCount(fen: string) {
        const trimmedFen = trimFen(fen);
        return this._positionCount[trimmedFen] || 0;
    }

    private _incPositionCount(fen: string) {
        const trimmedFen = trimFen(fen);
        if (this._positionCount[trimmedFen] === undefined) {
            this._positionCount[trimmedFen] = 0;
        }
        this._positionCount[trimmedFen] += 1;
    }

    private _decPositionCount(fen: string) {
        const trimmedFen = trimFen(fen);
        if (this._positionCount[trimmedFen] === 1) {
            delete this._positionCount[trimmedFen];
        } else {
            this._positionCount[trimmedFen] -= 1;
        }
    }

    private _pruneComments() {
        const reversedHistory = [];
        const currentComments: Record<string, string> = {};

        const copyComment = (fen: string) => {
            if (fen in this._comments) {
                currentComments[fen] = this._comments[fen];
            }
        };

        while (this._history.length > 0) {
            reversedHistory.push(this._undoMove());
        }

        copyComment(this.fen());

        while (true) {
            const move = reversedHistory.pop();
            if (!move) {
                break;
            }
            this._makeMove(move);
            copyComment(this.fen());
        }
        this._comments = currentComments;
    }

    getComment() {
        return this._comments[this.fen()];
    }

    setComment(comment: string) {
        this._comments[this.fen()] = comment.replace('{', '[').replace('}', ']');
    }

    deleteComment() {
        const comment = this._comments[this.fen()];
        delete this._comments[this.fen()];
        return comment;
    }

    getComments() {
        this._pruneComments();
        return Object.keys(this._comments).map((fen: string) => {
            return { fen: fen, comment: this._comments[fen] };
        });
    }

    deleteComments() {
        this._pruneComments();
        return Object.keys(this._comments).map((fen) => {
            const comment = this._comments[fen];
            delete this._comments[fen];
            return { fen: fen, comment: comment };
        });
    }

    moveNumber() {
        return this._moveNumber;
    }

    // Coral Clash specific methods

    /**
     * Check if a square has coral and what color
     */
    getCoral(square: Square): Color | null {
        return this._coral[Ox88[square]] || null;
    }

    /**
     * Place coral on a square
     */
    placeCoral(square: Square, color: Color): boolean {
        const sq = Ox88[square];

        // Can't place if there's already coral there
        if (this._coral[sq]) {
            return false;
        }

        // Can't place if no coral remaining
        if (this._coralRemaining[color] <= 0) {
            return false;
        }

        this._coral[sq] = color;
        this._coralRemaining[color]--;
        return true;
    }

    /**
     * Remove coral from a square
     */
    removeCoral(square: Square): Color | null {
        const sq = Ox88[square];
        const coralColor = this._coral[sq];

        if (coralColor) {
            this._coral[sq] = null;
            this._coralRemaining[coralColor]++;
            return coralColor;
        }

        return null;
    }

    /**
     * Get remaining coral count for a player
     */
    getCoralRemaining(color: Color): number {
        return this._coralRemaining[color];
    }

    /**
     * Get all squares with coral of a specific color
     */
    getCoralSquares(color: Color): Square[] {
        const squares: Square[] = [];
        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (i & 0x88) {
                i += 7;
                continue;
            }
            if (this._coral[i] === color) {
                squares.push(algebraic(i));
            }
        }
        return squares;
    }

    /**
     * Calculate coral area control (squares with coral not occupied by opponent)
     */
    getCoralAreaControl(color: Color): number {
        let count = 0;
        const opponent = swapColor(color);

        for (let i = Ox88.a8; i <= Ox88.h1; i++) {
            if (i & 0x88) {
                i += 7;
                continue;
            }

            // Count coral of this color that isn't occupied by opponent
            if (this._coral[i] === color) {
                const piece = this._board[i];
                if (!piece || piece.color !== opponent) {
                    count++;
                }
            }
        }

        return count;
    }
}

export type CoralClashInstance = CoralClash;

import type { Color, PieceRole, PieceSymbol } from './coralClash.js';

/**
 * Zobrist hash keys for position hashing
 * Pre-generated random numbers for each piece/square/color/role combination
 * Uses a deterministic PRNG for consistent debugging.
 */
export class ZobristKeys {
    // Piece keys: [pieceType][square][color][role]
    // pieceType: 'h' (whale), 'd' (dolphin), 't' (turtle), 'f' (pufferfish), 'o' (octopus), 'c' (crab)
    // square: 0-63 (64 squares)
    // color: 0=white, 1=black
    // role: 0=none (whale), 1=hunter, 2=gatherer
    private pieceKeys: Record<string, bigint[][][]> = {};

    // Coral keys: [square][color]
    // square: 0-63
    // color: 0=white, 1=black, 2=no coral
    private coralKeys: bigint[][] = [];

    // Turn key: 0=white, 1=black
    private turnKey: bigint[] = [];

    // Deterministic PRNG seed
    private prng = this.mulberry32(123456789);

    constructor() {
        this.initializeKeys();
    }

    /**
     * Mulberry32 PRNG for deterministic random number generation
     */
    private mulberry32(a: number) {
        return function() {
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0);
        }
    }

    /**
     * Generate a random 64-bit integer (using BigInt)
     */
    private randomKey(): bigint {
        // Generate 64 bits of randomness using two 32-bit random numbers
        const h = BigInt(this.prng());
        const l = BigInt(this.prng());
        return (h << 32n) | l;
    }

    /**
     * Initialize all Zobrist keys
     */
    private initializeKeys(): void {
        const pieceTypes: PieceSymbol[] = ['h', 'd', 't', 'f', 'o', 'c'];
        const colors: Color[] = ['w', 'b'];
        const roles: (PieceRole | null)[] = [null, 'hunter', 'gatherer'];

        // Initialize piece keys
        for (const piece of pieceTypes) {
            this.pieceKeys[piece] = [];
            for (let square = 0; square < 64; square++) {
                this.pieceKeys[piece][square] = [];
                for (let colorIdx = 0; colorIdx < colors.length; colorIdx++) {
                    this.pieceKeys[piece][square][colorIdx] = [];
                    for (let roleIdx = 0; roleIdx < roles.length; roleIdx++) {
                        const key = this.randomKey();
                        this.pieceKeys[piece][square][colorIdx][roleIdx] = key;
                    }
                }
            }
        }

        // Initialize coral keys (64 squares, 3 states: white, black, none)
        for (let square = 0; square < 64; square++) {
            this.coralKeys[square] = [];
            for (let coralState = 0; coralState < 3; coralState++) {
                this.coralKeys[square][coralState] = this.randomKey();
            }
        }

        // Initialize turn key
        this.turnKey[0] = this.randomKey(); // White to move
        this.turnKey[1] = this.randomKey(); // Black to move
    }

    /**
     * Get piece key for a piece at a square
     * @param square - The 0-63 square index (not the 0x88 index)
     */
    getPieceKey(piece: PieceSymbol, square: number, color: Color, role: PieceRole | null): bigint {
        const colorIdx = color === 'w' ? 0 : 1;
        const roleIdx = role === null ? 0 : role === 'hunter' ? 1 : 2;
        const pieceKeyArray = this.pieceKeys[piece];
        if (!pieceKeyArray || !pieceKeyArray[square] || !pieceKeyArray[square][colorIdx]) {
            return 0n; // Fallback if key not found (shouldn't happen)
        }
        return pieceKeyArray[square][colorIdx][roleIdx] || 0n;
    }

    /**
     * Get coral key for a square
     * @param square - The 0-63 square index (not the 0x88 index)
     */
    getCoralKey(square: number, coralColor: Color | null): bigint {
        const coralState = coralColor === 'w' ? 0 : coralColor === 'b' ? 1 : 2;
        if (!this.coralKeys[square]) {
            return 0n; // Fallback if key not found
        }
        return this.coralKeys[square][coralState] || 0n;
    }

    /**
     * Get turn key
     */
    getTurnKey(color: Color): bigint {
        return this.turnKey[color === 'w' ? 0 : 1];
    }
}

// Singleton instance of Zobrist keys (generated once)
export const zobristKeys = new ZobristKeys();

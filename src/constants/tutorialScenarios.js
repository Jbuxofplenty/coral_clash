/**
 * Tutorial Scenarios for How-To Play
 * Each scenario demonstrates a specific game concept with a visual board state
 */

export const TUTORIAL_SCENARIOS = {
    checkmate: {
        id: 'checkmate',
        title: 'Checkmate Example',
        description:
            'The Black Whale is trapped by coral at a6 (denoted by the pink border). The White Hunter Dolphin at b7 puts the Whale in check, and the White Gatherer Turtle (with coral icons on border) at g7 protects the attacking dolphin. The Whale has no escape - checkmate!',
        fixture: {
            schemaVersion: '1.1.0',
            exportedAt: new Date().toISOString(),
            state: {
                fen: 'h7/hD4T1/8/8/8/8/8/8 w - - 0 1',
                board: [
                    [
                        { square: 'a8', type: 'h', color: 'b' },
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                    ],
                    [
                        { square: 'a7', type: 'h', color: 'b' },
                        { square: 'b7', type: 'd', color: 'w', role: 'hunter' },
                        null,
                        null,
                        null,
                        null,
                        { square: 'g7', type: 't', color: 'w', role: 'gatherer' },
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                ],
                history: [],
                turn: 'w',
                whalePositions: {
                    w: [],
                    b: ['a8', 'a7'],
                },
                coral: [{ square: 'a6', color: 'w' }],
                isGameOver: true,
                inCheck: true,
                isCheckmate: true,
                isStalemate: false,
                isDraw: false,
                isCoralVictory: null,
            },
        },
    },

    whaleMovement: {
        id: 'whaleMovement',
        title: 'Whale Movement',
        description:
            'Whales occupy two adjacent squares and can move in three ways: (1) Slide one half any number of squares while the other stays still, (2) Slide both halves together in the same direction (parallel sliding), or (3) Rotate by moving one half to an adjacent square. The whale must always remain on two adjacent orthogonal squares.',
        fixture: {
            schemaVersion: '1.1.0',
            exportedAt: new Date().toISOString(),
            state: {
                fen: '8/8/8/8/3H4/8/8/8 w - - 0 1',
                board: [
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [
                        null,
                        null,
                        null,
                        { square: 'd4', type: 'h', color: 'w' },
                        { square: 'e4', type: 'h', color: 'w' },
                        null,
                        null,
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                ],
                history: [],
                turn: 'w',
                whalePositions: {
                    w: ['d4', 'e4'],
                    b: [],
                },
                isGameOver: false,
                inCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isCoralVictory: null,
            },
        },
    },

    coralMovementComparison: {
        id: 'coralMovementComparison',
        title: 'Coral Movement Comparison',
        description:
            'Compare the White Hunter Dolphin (left, no coral icons) with the White Gatherer Dolphin (right, with coral icons). Tap each to see their moves. The Hunter Dolphin is BLOCKED by coral and cannot move through it, while the Gatherer Dolphin can pass THROUGH coral freely, making it more powerful.',
        fixture: {
            schemaVersion: '1.1.0',
            exportedAt: new Date().toISOString(),
            state: {
                fen: '8/8/8/8/2D2D2/8/8/8 w - - 0 1',
                board: [
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [
                        null,
                        null,
                        { square: 'c4', type: 'd', color: 'w', role: 'hunter' },
                        null,
                        null,
                        { square: 'f4', type: 'd', color: 'w', role: 'gatherer' },
                        null,
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                ],
                history: [],
                turn: 'w',
                whalePositions: {
                    w: [],
                    b: [],
                },
                coral: [
                    { square: 'c6', color: 'w' },
                    { square: 'd5', color: 'b' },
                    { square: 'f6', color: 'w' },
                    { square: 'g5', color: 'b' },
                ],
                isGameOver: false,
                inCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isCoralVictory: null,
            },
        },
    },

    check: {
        id: 'check',
        title: 'Check',
        description:
            'The Black Whale is in check - it is being attacked by the White Gatherer Dolphin (with coral icons on border). The Gatherer Dolphin can move through coral, so it passed through the coral at d7 to attack the whale. The whale cannot capture the dolphin because the coral blocks it. Black must move the Whale out of danger or block the attack on their next turn.',
        fixture: {
            schemaVersion: '1.1.0',
            exportedAt: new Date().toISOString(),
            state: {
                fen: '3h4/8/2D5/8/8/8/8/8 b - - 0 1',
                board: [
                    [
                        null,
                        null,
                        null,
                        { square: 'd8', type: 'h', color: 'b' },
                        { square: 'e8', type: 'h', color: 'b' },
                        null,
                        null,
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [
                        null,
                        null,
                        { square: 'c6', type: 'd', color: 'w', role: 'gatherer' },
                        null,
                        null,
                        null,
                        null,
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                ],
                history: [],
                turn: 'b',
                whalePositions: {
                    w: [],
                    b: ['d8', 'e8'],
                },
                coral: [{ square: 'd7', color: 'w' }],
                isGameOver: false,
                inCheck: true,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isCoralVictory: null,
            },
        },
    },

    hunterEffect: {
        id: 'hunterEffect',
        title: 'Hunter Effect',
        description:
            'Hunter pieces (those without four coral icons) stop when they move onto Coral. They can then remove that Coral from the board. Watch the White Hunter Crab move onto coral and remove it.',
        fixture: {
            schemaVersion: '1.1.0',
            exportedAt: new Date().toISOString(),
            state: {
                fen: '8/8/8/8/2C5/8/8/8 w - - 0 1',
                board: [
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [
                        null,
                        null,
                        { square: 'c4', type: 'c', color: 'w', role: 'hunter' },
                        null,
                        null,
                        null,
                        null,
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                ],
                history: [],
                turn: 'w',
                whalePositions: {
                    w: [],
                    b: [],
                },
                coral: [{ square: 'd4', color: 'b' }],
                isGameOver: false,
                inCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isCoralVictory: null,
            },
        },
        // Auto-play sequence: crab moves onto coral (stops), then removes it
        autoPlaySequence: {
            moves: [
                { from: 'c4', to: 'd4' }, // Crab moves onto coral and stops
            ],
            delayBetweenMoves: 1500, // 1.5 seconds between moves
            pauseAtEnd: 2500, // 2.5 seconds before reset
            showPath: true, // Highlight the path before moving
        },
    },

    gathererEffect: {
        id: 'gathererEffect',
        title: 'Gatherer Effect',
        description:
            'Gatherer pieces (those with four coral icons) can place Coral on empty squares they move to. Watch the White Gatherer Octopus move and place coral.',
        fixture: {
            schemaVersion: '1.1.0',
            exportedAt: new Date().toISOString(),
            state: {
                fen: '8/8/8/8/4O3/8/8/8 w - - 0 1',
                board: [
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [
                        null,
                        null,
                        null,
                        null,
                        { square: 'e4', type: 'o', color: 'w', role: 'gatherer' },
                        null,
                        null,
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                ],
                history: [],
                turn: 'w',
                whalePositions: {
                    w: [],
                    b: [],
                },
                isGameOver: false,
                inCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isCoralVictory: null,
            },
        },
        // Auto-play sequence: octopus moves and places coral
        autoPlaySequence: {
            moves: [
                { from: 'e4', to: 'f5', flags: 'p' }, // Octopus moves diagonally and places coral
            ],
            delayBetweenMoves: 1500, // 1.5 seconds between moves
            pauseAtEnd: 2500, // 2.5 seconds before reset
            showPath: true, // Highlight the path before moving
        },
    },

    dolphinMovement: {
        id: 'dolphinMovement',
        title: 'Dolphin Movement',
        description:
            'Dolphins can move any number of squares in any direction - vertically, horizontally, or diagonally. They are the most versatile piece in Coral Clash!',
        fixture: {
            schemaVersion: '1.1.0',
            exportedAt: new Date().toISOString(),
            state: {
                fen: '8/8/8/8/3D4/8/8/8 w - - 0 1',
                board: [
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [
                        null,
                        null,
                        null,
                        { square: 'd4', type: 'd', color: 'w', role: 'hunter' },
                        null,
                        null,
                        null,
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                ],
                history: [],
                turn: 'w',
                whalePositions: {
                    w: [],
                    b: [],
                },
                isGameOver: false,
                inCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isCoralVictory: null,
            },
        },
    },

    turtleMovement: {
        id: 'turtleMovement',
        title: 'Turtle Movement',
        description:
            'Turtles can move any number of squares vertically or horizontally, but not diagonally. They move in straight lines along ranks and files.',
        fixture: {
            schemaVersion: '1.1.0',
            exportedAt: new Date().toISOString(),
            state: {
                fen: '8/8/8/8/3T4/8/8/8 w - - 0 1',
                board: [
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [
                        null,
                        null,
                        null,
                        { square: 'd4', type: 't', color: 'w', role: 'hunter' },
                        null,
                        null,
                        null,
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                ],
                history: [],
                turn: 'w',
                whalePositions: {
                    w: [],
                    b: [],
                },
                isGameOver: false,
                inCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isCoralVictory: null,
            },
        },
    },

    pufferfishMovement: {
        id: 'pufferfishMovement',
        title: 'Pufferfish Movement',
        description:
            'Pufferfish can move any number of squares diagonally. They slide along diagonal lines across the board.',
        fixture: {
            schemaVersion: '1.1.0',
            exportedAt: new Date().toISOString(),
            state: {
                fen: '8/8/8/8/3F4/8/8/8 w - - 0 1',
                board: [
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [
                        null,
                        null,
                        null,
                        { square: 'd4', type: 'f', color: 'w', role: 'hunter' },
                        null,
                        null,
                        null,
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                ],
                history: [],
                turn: 'w',
                whalePositions: {
                    w: [],
                    b: [],
                },
                isGameOver: false,
                inCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isCoralVictory: null,
            },
        },
    },

    crabMovement: {
        id: 'crabMovement',
        title: 'Crab Movement',
        description:
            'Crabs move one square at a time vertically or horizontally. They are slow but steady pieces.',
        fixture: {
            schemaVersion: '1.1.0',
            exportedAt: new Date().toISOString(),
            state: {
                fen: '8/8/8/8/3C4/8/8/8 w - - 0 1',
                board: [
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [
                        null,
                        null,
                        null,
                        { square: 'd4', type: 'c', color: 'w', role: 'hunter' },
                        null,
                        null,
                        null,
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                ],
                history: [],
                turn: 'w',
                whalePositions: {
                    w: [],
                    b: [],
                },
                isGameOver: false,
                inCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isCoralVictory: null,
            },
        },
    },

    octopusMovement: {
        id: 'octopusMovement',
        title: 'Octopus Movement',
        description:
            'Octopuses move one square diagonally. Like Crabs, they move slowly but can be very strategic.',
        fixture: {
            schemaVersion: '1.1.0',
            exportedAt: new Date().toISOString(),
            state: {
                fen: '8/8/8/8/3O4/8/8/8 w - - 0 1',
                board: [
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [
                        null,
                        null,
                        null,
                        { square: 'd4', type: 'o', color: 'w', role: 'hunter' },
                        null,
                        null,
                        null,
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                ],
                history: [],
                turn: 'w',
                whalePositions: {
                    w: [],
                    b: [],
                },
                isGameOver: false,
                inCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isCoralVictory: null,
            },
        },
    },

    capture: {
        id: 'capture',
        title: 'Capturing Pieces',
        description:
            'To capture an enemy piece, move one of your pieces to the square occupied by the enemy. The White Dolphin can capture the Black Crab by moving to its square.',
        fixture: {
            schemaVersion: '1.1.0',
            exportedAt: new Date().toISOString(),
            state: {
                fen: '8/6c1/8/8/3D4/8/8/8 w - - 0 1',
                board: [
                    [null, null, null, null, null, null, null, null],
                    [
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        { square: 'g7', type: 'c', color: 'b', role: 'hunter' },
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [
                        null,
                        null,
                        null,
                        { square: 'd4', type: 'd', color: 'w', role: 'hunter' },
                        null,
                        null,
                        null,
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null],
                ],
                history: [],
                turn: 'w',
                whalePositions: {
                    w: [],
                    b: [],
                },
                isGameOver: false,
                inCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isCoralVictory: null,
            },
        },
        // Auto-play sequence: dolphin captures crab
        autoPlaySequence: {
            moves: [
                { from: 'd4', to: 'g7' }, // Dolphin captures crab
            ],
            delayBetweenMoves: 3000, // 3 seconds to see the path and move
            pauseAtEnd: 5000, // 5 seconds before reset
            showPath: true, // Highlight the path before moving
        },
    },
};

/**
 * Get a scenario by ID
 * @param {string} scenarioId - The ID of the scenario to retrieve
 * @returns {Object|null} The scenario object or null if not found
 */
export function getScenario(scenarioId) {
    return TUTORIAL_SCENARIOS[scenarioId] || null;
}

/**
 * Get all scenario IDs
 * @returns {Array<string>} Array of all scenario IDs
 */
export function getAllScenarioIds() {
    return Object.keys(TUTORIAL_SCENARIOS);
}

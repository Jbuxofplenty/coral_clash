/**
 * Tutorial Scenarios for How-To Play
 * Each scenario demonstrates a specific game concept with a visual board state
 */

export const TUTORIAL_SCENARIOS = {
    checkmate: {
        id: 'checkmate',
        titleKey: 'tutorialScenarios.checkmate.title',
        descriptionKey: 'tutorialScenarios.checkmate.description',
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

    coralVictory: {
        id: 'coralVictory',
        titleKey: 'tutorialScenarios.coralVictory.title',
        descriptionKey: 'tutorialScenarios.coralVictory.description',
        fixture: {
            schemaVersion: '1.1.0',
            exportedAt: new Date().toISOString(),
            state: {
                fen: 'hh6/8/8/8/8/2d5/8/5HH w - - 0 1',
                board: [
                    [
                        { square: 'a8', type: 'h', color: 'b' },
                        { square: 'b8', type: 'h', color: 'b' },
                        null,
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
                    [
                        null,
                        null,
                        { square: 'c3', type: 'd', color: 'b', role: 'gatherer' },
                        null,
                        null,
                        null,
                        null,
                        null,
                    ],
                    [null, null, null, null, null, null, null, null],
                    [
                        null,
                        null,
                        null,
                        null,
                        null,
                        { square: 'f1', type: 'h', color: 'w' },
                        { square: 'g1', type: 'h', color: 'w' },
                        null,
                    ],
                ],
                history: [],
                turn: 'w',
                whalePositions: {
                    w: ['f1', 'g1'],
                    b: ['a8', 'b8'],
                },
                coral: [
                    // White coral (4 total, but one is occupied)
                    { square: 'c3', color: 'w' }, // Occupied by black dolphin - doesn't count for white!
                    { square: 'd3', color: 'w' },
                    { square: 'e3', color: 'w' },
                    { square: 'f3', color: 'w' },
                    // Black coral (4 total, all unoccupied)
                    { square: 'c6', color: 'b' },
                    { square: 'd6', color: 'b' },
                    { square: 'e6', color: 'b' },
                    { square: 'f6', color: 'b' },
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

    whaleMovement: {
        id: 'whaleMovement',
        titleKey: 'tutorialScenarios.whaleMovement.title',
        descriptionKey: 'tutorialScenarios.whaleMovement.description',
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

    whaleRotation: {
        id: 'whaleRotation',
        titleKey: 'tutorialScenarios.whaleRotation.title',
        descriptionKey: 'tutorialScenarios.whaleRotation.description',
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
        autoPlaySequence: {
            moves: [
                { from: 'e4', to: 'd5', whaleSecondSquare: 'd4' }, // Rotate: e4 moves to d5, d4 stays (final: d4-d5)
            ],
            delayBetweenMoves: 2000,
            pauseAtEnd: 3000,
            showPath: true,
        },
    },

    whaleCoralException: {
        id: 'whaleCoralException',
        titleKey: 'tutorialScenarios.whaleCoralException.title',
        descriptionKey: 'tutorialScenarios.whaleCoralException.description',
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
                coral: [
                    { square: 'd4', color: 'w' },
                    // Row 5 coral to block upward movement
                    { square: 'c5', color: 'b' },
                    { square: 'd5', color: 'b' },
                    { square: 'e5', color: 'b' },
                    // Row 3 coral to block downward movement
                    { square: 'c3', color: 'b' },
                    { square: 'd3', color: 'b' },
                    { square: 'e3', color: 'b' },
                    // Row 4 coral to block rightward movement
                    { square: 'f4', color: 'b' },
                ],
                isGameOver: false,
                inCheck: false,
                isCheckmate: false,
                isStalemate: false,
                isDraw: false,
                isCoralVictory: null,
            },
        },
        autoPlaySequence: {
            moves: [
                { from: 'd4', to: 'a4' }, // Move right half from e4 to b4 (through d4 coral), resulting in whale at a4-b4
            ],
            delayBetweenMoves: 2000,
            pauseAtEnd: 3000,
            showPath: true,
        },
    },

    coralMovementComparison: {
        id: 'coralMovementComparison',
        titleKey: 'tutorialScenarios.coralMovementComparison.title',
        descriptionKey: 'tutorialScenarios.coralMovementComparison.description',
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
        titleKey: 'tutorialScenarios.check.title',
        descriptionKey: 'tutorialScenarios.check.description',
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
        titleKey: 'tutorialScenarios.hunterEffect.title',
        descriptionKey: 'tutorialScenarios.hunterEffect.description',
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
                coralRemaining: { w: 17, b: 16 },
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
                { from: 'c4', to: 'd4', coralRemoved: true }, // Crab moves onto coral and removes it
            ],
            delayBetweenMoves: 1500, // 1.5 seconds between moves
            pauseAtEnd: 2500, // 2.5 seconds before reset
            showPath: true, // Highlight the path before moving
        },
    },

    gathererEffect: {
        id: 'gathererEffect',
        titleKey: 'tutorialScenarios.gathererEffect.title',
        descriptionKey: 'tutorialScenarios.gathererEffect.description',
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
                coral: [],
                coralRemaining: { w: 17, b: 17 },
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
                { from: 'e4', to: 'f5', coralPlaced: true }, // Octopus moves diagonally and places coral
            ],
            delayBetweenMoves: 1500, // 1.5 seconds between moves
            pauseAtEnd: 2500, // 2.5 seconds before reset
            showPath: true, // Highlight the path before moving
        },
    },

    dolphinMovement: {
        id: 'dolphinMovement',
        titleKey: 'tutorialScenarios.dolphinMovement.title',
        descriptionKey: 'tutorialScenarios.dolphinMovement.description',
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
        titleKey: 'tutorialScenarios.turtleMovement.title',
        descriptionKey: 'tutorialScenarios.turtleMovement.description',
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
        titleKey: 'tutorialScenarios.pufferfishMovement.title',
        descriptionKey: 'tutorialScenarios.pufferfishMovement.description',
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
        titleKey: 'tutorialScenarios.crabMovement.title',
        descriptionKey: 'tutorialScenarios.crabMovement.description',
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
        titleKey: 'tutorialScenarios.octopusMovement.title',
        descriptionKey: 'tutorialScenarios.octopusMovement.description',
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
        titleKey: 'tutorialScenarios.capture.title',
        descriptionKey: 'tutorialScenarios.capture.description',
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

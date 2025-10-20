import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import useCoralClash from '../hooks/useCoralClash';
import EmptyBoard from './EmptyBoard';
import Moves from './Moves';
import Pieces from './Pieces';

const useRandomMove = (coralClash) => {
    while (!coralClash.isGameOver() && coralClash.turn() === 'b') {
        const moves = coralClash.moves();
        const move = moves[Math.floor(Math.random() * moves.length)];
        coralClash.move(move);
    }
};

const CoralClash = () => {
    const { width } = useWindowDimensions();
    const coralClash = useCoralClash();
    const [visibleMoves, setVisibleMoves] = useState([]);
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [whaleDestination, setWhaleDestination] = useState(null);
    const [whaleOrientationMoves, setWhaleOrientationMoves] = useState([]);
    const boardSize = Math.min(width, 400);

    useRandomMove(coralClash);

    const handleSelectPiece = (square) => {
        const piece = coralClash.get(square);

        // Check if this is a whale
        if (piece && piece.type.toLowerCase() === 'k') {
            // Whale selected - get ALL moves (from BOTH squares of the whale)
            // Moves are generated separately from each square, so we need to get all moves
            const allMoves = coralClash.moves({ verbose: true });

            // Filter to only THIS whale's moves
            const whaleColor = piece.color.toLowerCase();
            const whaleMoves = allMoves.filter(
                (m) => m.piece.toLowerCase() === 'k' && m.color.toLowerCase() === whaleColor,
            );

            const allDestinations = new Set();
            whaleMoves.forEach((move) => {
                allDestinations.add(move.to);
            });

            // Create a simple move list with just destinations (we'll filter later)
            const destinationMoves = Array.from(allDestinations).map((dest) => {
                // Find a whale move that goes to this destination
                return whaleMoves.find((m) => m.to === dest);
            });

            console.log(
                'Selected',
                whaleColor,
                'whale at',
                square,
                '- found',
                destinationMoves.length,
                'destinations',
            );

            setVisibleMoves(destinationMoves);
            setSelectedSquare(square);
            setWhaleDestination(null);
            setWhaleOrientationMoves([]);
        } else {
            // Regular piece
            const moves = coralClash.moves({ square: square, verbose: true });
            setVisibleMoves(moves);
            setSelectedSquare(null);
            setWhaleDestination(null);
            setWhaleOrientationMoves([]);
        }
    };

    const handleSelectMove = (move) => {
        const piece = coralClash.get(selectedSquare || move.from);

        // Check if this is a whale move and we haven't selected the first square yet
        if (piece && piece.type.toLowerCase() === 'k' && !whaleDestination) {
            // First click - user selected where one whale half should go
            // Get ALL verbose moves (whale moves come from both squares)
            const allMoves = coralClash.moves({ verbose: true });

            // Find WHALE moves that go to the clicked destination from THIS whale (not opponent)
            const whaleColor = piece.color.toLowerCase();
            const movesToThisSquare = allMoves.filter(
                (m) =>
                    m.to === move.to &&
                    m.piece.toLowerCase() === 'k' &&
                    m.color.toLowerCase() === whaleColor,
            );

            console.log('Clicked destination:', move.to);
            console.log('Found', movesToThisSquare.length, 'whale moves to this square');
            if (movesToThisSquare.length > 0) {
                console.log('Sample whale move:', movesToThisSquare[0]);
            }

            if (movesToThisSquare.length > 0) {
                // Group moves by their 'from' square - each unique 'from' represents a different orientation
                const orientationMap = new Map();

                movesToThisSquare.forEach((m) => {
                    // Use 'from' as the key - different starting squares = different orientations
                    if (!orientationMap.has(m.from)) {
                        orientationMap.set(m.from, m);
                    }
                });

                console.log('Clicked destination:', move.to);
                console.log(
                    'Found',
                    orientationMap.size,
                    'unique orientations (by from square):',
                    Array.from(orientationMap.keys()),
                );

                // If only one orientation, execute immediately
                if (orientationMap.size === 1) {
                    const onlyMove = Array.from(orientationMap.values())[0];
                    console.log('Only one orientation, executing move:', onlyMove);
                    coralClash.move({ from: onlyMove.from, to: onlyMove.to });
                    setSelectedSquare(null);
                    setVisibleMoves([]);
                    setWhaleDestination(null);
                    setWhaleOrientationMoves([]);
                    return;
                }

                // Multiple orientations - show them to the user
                // For whale moves, the 'from' square represents where one half is coming from
                // We want to highlight the 'from' squares as orientation options
                setWhaleDestination(move.to);
                setWhaleOrientationMoves(movesToThisSquare);

                // Create "moves" for each unique orientation to render
                const adjacentMoves = Array.from(orientationMap.entries()).map(
                    ([fromSquare, m]) => {
                        console.log('Orientation option:', fromSquare, 'to', m.to);

                        return {
                            ...m,
                            to: fromSquare, // Show the 'from' square as the option to click
                            actualMove: m, // Store original move
                        };
                    },
                );

                // Also add the selected destination square to keep it highlighted
                const destinationSquareMove = {
                    ...movesToThisSquare[0],
                    to: move.to,
                    isDestinationMarker: true,
                };

                setVisibleMoves([destinationSquareMove, ...adjacentMoves]);
                return;
            } else {
                // No moves found to this square - shouldn't happen
                console.error('No whale moves found to square:', move.to);
                return;
            }
        } else if (whaleDestination) {
            // Second click - user selected which orientation (clicked on a 'from' square)
            // Find the move where 'from' matches what they clicked and 'to' matches the destination
            const selectedMove = whaleOrientationMoves.find((m) => {
                console.log(
                    'Checking if from',
                    m.from,
                    'matches clicked',
                    move.to,
                    'and to matches',
                    whaleDestination,
                );
                return m.from === move.to && m.to === whaleDestination;
            });

            if (selectedMove) {
                coralClash.move(
                    selectedMove.promotion ? { ...selectedMove, promotion: 'q' } : selectedMove,
                );
                setVisibleMoves([]);
                setSelectedSquare(null);
                setWhaleDestination(null);
                setWhaleOrientationMoves([]);
                return;
            } else {
                console.error('No matching whale move found for orientation:', move.to);
                return;
            }
        }

        // Only execute moves for non-whale pieces
        // Whale moves should have returned by now
        if (piece && piece.type.toLowerCase() === 'k') {
            console.error('Whale move reached non-whale execution - this should not happen');
            return;
        }

        // Execute the move (non-whale pieces only)
        const actualMove = move.actualMove || move;
        coralClash.move(actualMove.promotion ? { ...actualMove, promotion: 'q' } : actualMove);
        setVisibleMoves([]);
        setSelectedSquare(null);
        setWhaleDestination(null);
        setWhaleOrientationMoves([]);
    };

    return (
        <View style={{ position: 'relative' }}>
            <EmptyBoard size={boardSize} />
            <Pieces board={coralClash.board()} onSelectPiece={handleSelectPiece} size={boardSize} />
            <Moves
                visibleMoves={visibleMoves}
                onSelectMove={handleSelectMove}
                size={boardSize}
                showOrientations={whaleDestination !== null}
                selectedDestination={whaleDestination}
            />
        </View>
    );
};

export default CoralClash;

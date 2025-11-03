import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image } from 'react-native';
import { WHALE } from '../../shared';
import PieceImages from '../assets/images/pieces';

/**
 * AnimatedPiece - Renders an animated piece that moves along a path
 *
 * @param {Object} props
 * @param {Object} props.move - Move data with from/to squares
 * @param {Object} props.piece - Piece being moved {type, color, role}
 * @param {number} props.size - Board size in pixels
 * @param {boolean} props.boardFlipped - Whether board is flipped
 * @param {string} props.userColor - User's color for piece styling
 * @param {Function} props.onComplete - Callback when animation finishes
 */
const AnimatedPiece = ({ move, piece, size, boardFlipped, userColor, onComplete }) => {
    const cellSize = size / 8;
    const [currentPathIndex, setCurrentPathIndex] = useState(0);
    const positionAnim = useRef(new Animated.ValueXY()).current;
    const opacityAnim = useRef(new Animated.Value(1)).current;

    // Build the path: from square -> intermediate squares -> to square
    const buildPath = () => {
        const path = [move.from];

        // Get coordinates for from and to squares
        const fromFile = move.from.charCodeAt(0) - 'a'.charCodeAt(0);
        const fromRank = parseInt(move.from[1]) - 1;
        const toFile = move.to.charCodeAt(0) - 'a'.charCodeAt(0);
        const toRank = parseInt(move.to[1]) - 1;

        // Calculate movement direction
        const fileDiff = toFile - fromFile;
        const rankDiff = toRank - fromRank;

        // For diagonal, horizontal, or vertical moves, add intermediate squares
        // This makes knights and other pieces "hop" through squares
        const steps = Math.max(Math.abs(fileDiff), Math.abs(rankDiff));

        if (steps > 0) {
            // For moves of more than 1 square in any direction, add intermediate squares
            if (steps === 1) {
                // Single square move - just add destination
                path.push(move.to);
            } else if (
                Math.abs(fileDiff) === Math.abs(rankDiff) ||
                fileDiff === 0 ||
                rankDiff === 0
            ) {
                // Diagonal, horizontal, or vertical multi-square move - add each square in path
                const fileStep = fileDiff === 0 ? 0 : fileDiff / Math.abs(fileDiff);
                const rankStep = rankDiff === 0 ? 0 : rankDiff / Math.abs(rankDiff);

                for (let i = 1; i <= steps; i++) {
                    const intermediateFile = fromFile + fileStep * i;
                    const intermediateRank = fromRank + rankStep * i;
                    const square =
                        String.fromCharCode('a'.charCodeAt(0) + intermediateFile) +
                        (intermediateRank + 1);
                    path.push(square);
                }
            } else {
                // Knight move or irregular move - just jump to destination
                path.push(move.to);
            }
        }

        return path;
    };

    const path = buildPath();

    // Convert square notation to pixel coordinates
    const squareToPosition = useCallback(
        (square) => {
            const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
            const rank = parseInt(square[1]) - 1;

            const left = boardFlipped ? (7 - file) * cellSize : file * cellSize;
            const bottom = boardFlipped ? (8 - rank - 1) * cellSize : rank * cellSize;

            return { x: left, y: size - bottom - cellSize };
        },
        [boardFlipped, cellSize, size],
    );

    // Get piece image key
    const getPieceImageKey = () => {
        const isUserPiece = userColor ? piece.color === userColor : piece.color === 'w';
        const displayColor = isUserPiece ? 'W' : 'B';
        const hasCoral = piece.role === 'gatherer';

        return hasCoral
            ? `${displayColor}${piece.type.toUpperCase()}C`
            : `${displayColor}${piece.type.toUpperCase()}`;
    };

    // Handle whale orientation
    const isWhale = piece.type === WHALE;
    const [whaleOrientation, setWhaleOrientation] = useState('horizontal');

    useEffect(() => {
        if (!isWhale || !move.whaleSecondSquare) return;

        // Determine final orientation from move.to and move.whaleSecondSquare
        // if move.to and move.whaleSecondSquare are on same rank, orientation is horizontal
        const toRank = parseInt(move.to[1]) - 1;
        const whaleSecondRank = parseInt(move.whaleSecondSquare[1]) - 1;

        const finalOrientation = toRank === whaleSecondRank ? 'horizontal' : 'vertical';
        setWhaleOrientation(finalOrientation);
    }, [isWhale, move]);

    useEffect(() => {
        if (currentPathIndex >= path.length) {
            // Animation complete
            onComplete();
            return;
        }

        const targetSquare = path[currentPathIndex];
        const targetPos = squareToPosition(targetSquare);

        // Initial position setup
        if (currentPathIndex === 0) {
            positionAnim.setValue({ x: targetPos.x, y: targetPos.y });
            setCurrentPathIndex(1);
            return;
        }

        // Animate to next square
        // Adjust duration based on path length and position
        const isKnightMove =
            path.length === 2 &&
            Math.abs(
                (path[0].charCodeAt(0) - path[1].charCodeAt(0)) *
                    (parseInt(path[0][1]) - parseInt(path[1][1])),
            ) === 2;
        const duration = isKnightMove ? 200 : currentPathIndex === 1 ? 200 : 120;

        Animated.parallel([
            Animated.timing(positionAnim, {
                toValue: { x: targetPos.x, y: targetPos.y },
                duration,
                useNativeDriver: true,
            }),
            // Slight bounce effect
            Animated.sequence([
                Animated.timing(opacityAnim, {
                    toValue: 0.8,
                    duration: duration / 2,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: duration / 2,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(() => {
            // Pause briefly on intermediate squares, no pause on final square
            const isLastSquare = currentPathIndex >= path.length - 1;
            const pauseDuration = isLastSquare ? 0 : 80;
            setTimeout(() => {
                setCurrentPathIndex(currentPathIndex + 1);
            }, pauseDuration);
        });
    }, [
        currentPathIndex,
        path,
        size,
        boardFlipped,
        positionAnim,
        opacityAnim,
        squareToPosition,
        onComplete,
    ]);

    if (!piece || path.length === 0) return null;

    const imageKey = getPieceImageKey();

    // Base style for the piece
    // Render whales as single cell during animation to avoid overlap
    const baseStyle = {
        position: 'absolute',
        width: cellSize,
        height: cellSize,
    };

    // Apply rotation and position adjustment for vertical whales
    const transform = [...positionAnim.getTranslateTransform()];
    if (isWhale && whaleOrientation === 'vertical') {
        // For vertical whales, we need to adjust position because rotation happens around center
        // When rotating 90° clockwise, the 2-wide becomes 2-tall, 1-tall becomes 1-wide
        // Shift left and up to align the rotated image with the two vertical squares
        transform.push({ translateX: -cellSize / 2 });
        transform.push({ translateY: cellSize / 2 });

        // When board is flipped, compensate for the flip
        if (boardFlipped) {
            transform.push({ translateY: -cellSize });
        }

        // Apply the 90° clockwise rotation
        transform.push({ rotate: '90deg' });
    }

    return (
        <Animated.View
            style={{
                ...baseStyle,
                transform,
                opacity: opacityAnim,
                zIndex: 1000, // Render above everything
            }}
        >
            <Image
                style={{ width: '100%', height: '100%' }}
                source={PieceImages[imageKey]}
                resizeMode='contain'
            />
        </Animated.View>
    );
};

export default AnimatedPiece;

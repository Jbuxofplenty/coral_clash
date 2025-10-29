import { WHALE } from '../../shared';
import PieceImages from '../assets/images/pieces';
import { useGamePreferences } from '../contexts';

import { Image, TouchableWithoutFeedback, View } from 'react-native';

const Pieces = ({
    board,
    size,
    onSelectPiece,
    userColor = null,
    boardFlipped = null,
    isProcessing = false,
}) => {
    const { isBoardFlipped: contextBoardFlipped } = useGamePreferences();
    // Use provided boardFlipped if available, otherwise use context value
    const isBoardFlipped = boardFlipped !== null ? boardFlipped : contextBoardFlipped;
    const cellSize = size / 8;

    // Find all whale positions to determine orientation
    const flatBoard = board.flat().filter((cell) => cell);
    const whaleSquares = {};

    flatBoard.forEach((piece) => {
        if (piece.type === WHALE) {
            const whaleKey = `${piece.color}${WHALE}`;
            if (!whaleSquares[whaleKey]) {
                whaleSquares[whaleKey] = [];
            }
            whaleSquares[whaleKey].push(piece.square);
        }
    });

    // Track which whales we've already rendered the IMAGE for
    const renderedWhaleImages = new Set();
    const elements = [];

    flatBoard.forEach((piece) => {
        const { square, type, color, role } = piece;
        const [file, rank] = square.split('');
        const fileIndex = file.charCodeAt(0) - 'a'.charCodeAt(0);
        const left = isBoardFlipped ? (7 - fileIndex) * cellSize : fileIndex * cellSize;
        const bottom = isBoardFlipped ? (8 - parseInt(rank)) * cellSize : (rank - 1) * cellSize;

        // For whale, render image only once but touchable areas for both squares
        const isWhale = type === WHALE;
        const whaleKey = `${color}${WHALE}`;

        // Determine if piece should have coral decoration based on role
        const hasCoral = role === 'gatherer';

        // Determine if piece should be rendered in color or greyscale
        // If userColor is set, render user's pieces in color, opponent's in greyscale
        // If userColor is null (e.g., offline computer game), use default: white=color, black=grey
        const isUserPiece = userColor ? color === userColor : color === 'w';
        const displayColor = isUserPiece ? 'W' : 'B'; // W=colored, B=greyscale

        const pieceKey = hasCoral
            ? `${displayColor}${type.toUpperCase()}C`
            : `${displayColor}${type.toUpperCase()}`;

        if (isWhale) {
            // Render whale image only once from the first square (leftmost/bottommost)
            if (!renderedWhaleImages.has(whaleKey)) {
                renderedWhaleImages.add(whaleKey);

                // Determine orientation and find the leftmost/bottommost square
                const squares = whaleSquares[whaleKey];

                // Handle case where we only have info about one square
                if (!squares || squares.length === 0) {
                    console.warn('No whale squares found for', whaleKey);
                    return;
                }

                let isHorizontal = true;
                let renderSquare = squares[0];
                let renderFile = renderSquare.charCodeAt(0) - 'a'.charCodeAt(0);
                let renderRank = parseInt(renderSquare[1]) - 1;

                if (squares.length === 2) {
                    const [sq1, sq2] = squares.sort();
                    const file1 = sq1.charCodeAt(0) - 'a'.charCodeAt(0);
                    const file2 = sq2.charCodeAt(0) - 'a'.charCodeAt(0);
                    const rank1 = parseInt(sq1[1]) - 1;
                    const rank2 = parseInt(sq2[1]) - 1;

                    isHorizontal = rank1 === rank2; // Same rank = horizontal

                    // Render from leftmost (horizontal) or bottommost (vertical)
                    if (isHorizontal) {
                        renderSquare = file1 < file2 ? sq1 : sq2;
                        renderFile = Math.min(file1, file2);
                        renderRank = rank1;
                    } else {
                        renderSquare = rank1 < rank2 ? sq1 : sq2;
                        renderFile = file1;
                        renderRank = Math.min(rank1, rank2);
                    }
                } else {
                    console.warn('Only found 1 whale square:', squares, 'for', whaleKey);
                    // Default to horizontal if only one square found
                    isHorizontal = true;
                }

                // Calculate position from the render square
                let renderLeft = isBoardFlipped
                    ? (7 - renderFile) * cellSize
                    : renderFile * cellSize;
                let renderBottom = isBoardFlipped
                    ? (8 - renderRank - 1) * cellSize
                    : renderRank * cellSize;

                // For horizontal whales when flipped, we need to account for the 2-square width
                if (isHorizontal && isBoardFlipped) {
                    renderLeft -= cellSize; // Shift left by one cell since we're rendering from the right edge
                }

                // For vertical whales, adjust position so the rotated 2×1 image fits correctly in the 1×2 space
                if (!isHorizontal) {
                    // When rotating 90° clockwise, the 2-wide becomes 2-tall, 1-tall becomes 1-wide
                    // The rotation happens around the image center, so we need to reposition
                    // to make the rotated image align with the two vertical squares
                    renderLeft -= cellSize / 2; // Shift left to align the now-vertical image
                    renderBottom += cellSize / 2; // Shift up to align the bottom edge

                    // When board is flipped, adjust the vertical whale position
                    if (isBoardFlipped) {
                        renderBottom -= cellSize; // Compensate for the flip
                    }
                }

                // For vertical orientation, we need to rotate the image
                // The whale image is naturally horizontal, so we rotate 90° for vertical
                const imageStyle = {
                    position: 'absolute',
                    width: cellSize * 2, // Always use natural horizontal dimensions
                    height: cellSize,
                    left: renderLeft,
                    bottom: renderBottom,
                    opacity: isProcessing ? 0.5 : 1,
                };

                // Apply rotation for vertical whales only
                if (!isHorizontal) {
                    // Rotate 90 degrees clockwise around the center of the image
                    imageStyle.transform = [{ rotate: '90deg' }];
                }

                // Render the whale image spanning 2 squares
                elements.push(
                    <Image
                        key={`piece-image-${whaleKey}`}
                        style={imageStyle}
                        source={PieceImages[pieceKey]}
                        resizeMode='contain'
                    />,
                );
            }

            // Always render touchable area for each whale square
            elements.push(
                <TouchableWithoutFeedback
                    key={`piece-touch-${square}`}
                    onPress={() => onSelectPiece(square)}
                >
                    <View
                        style={{
                            position: 'absolute',
                            width: cellSize,
                            height: cellSize,
                            left,
                            bottom,
                        }}
                    />
                </TouchableWithoutFeedback>,
            );
        } else {
            // Regular piece - render normally
            elements.push(
                <TouchableWithoutFeedback
                    key={`piece-${square}`}
                    onPress={() => onSelectPiece(square)}
                >
                    <Image
                        style={{
                            position: 'absolute',
                            width: cellSize,
                            height: cellSize,
                            left,
                            bottom,
                            opacity: isProcessing ? 0.5 : 1,
                        }}
                        source={PieceImages[pieceKey]}
                        resizeMode='contain'
                    />
                </TouchableWithoutFeedback>,
            );
        }
    });

    return elements;
};

export default Pieces;

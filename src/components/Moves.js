import { TouchableWithoutFeedback, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const Moves = ({
    visibleMoves,
    size,
    onSelectMove,
    isEnemyMoves = false,
    boardFlipped = false,
    isPlayerTurn = true,
    isProcessing = false,
}) => {
    const cellSize = size / 8;

    // Define colors based on whether these are enemy moves
    // Reduce opacity when it's not the player's turn or when processing
    const opacityMultiplier = isPlayerTurn && !isProcessing ? 1 : 0.4;

    const colors = isEnemyMoves
        ? {
              fillLight: `rgba(255, 0, 0, ${0.35 * opacityMultiplier})`,
              fillNormal: `rgba(255, 0, 0, ${0.7 * opacityMultiplier})`,
              strokeLight: `rgba(200, 0, 0, ${0.6 * opacityMultiplier})`,
              strokeNormal: `rgba(200, 0, 0, ${1.0 * opacityMultiplier})`,
          }
        : {
              fillLight: `rgba(0, 255, 0, ${0.35 * opacityMultiplier})`,
              fillNormal: `rgba(0, 255, 0, ${0.7 * opacityMultiplier})`,
              strokeLight: `rgba(0, 200, 0, ${0.6 * opacityMultiplier})`,
              strokeNormal: `rgba(0, 200, 0, ${1.0 * opacityMultiplier})`,
          };

    // Deduplicate moves by destination square to prevent overlapping circles
    // (e.g., moves with/without coral placement go to the same square)
    const uniqueMoves = visibleMoves.reduce((acc, move) => {
        const existingMove = acc.find((m) => m.to === move.to);
        if (!existingMove) {
            acc.push(move);
        }
        return acc;
    }, []);

    return uniqueMoves.map((move, index) => {
        const { to, from, isDestinationMarker } = move;
        const [file, rank] = to.split('');
        const fileIndex = file.charCodeAt(0) - 'a'.charCodeAt(0);
        const left = boardFlipped ? (7 - fileIndex) * cellSize : fileIndex * cellSize;
        const bottom = boardFlipped ? (8 - parseInt(rank)) * cellSize : (rank - 1) * cellSize;

        // For whale moves, isDestinationMarker marks the first square (lighter)
        // For other pieces, this should always be undefined
        const isDestination = isDestinationMarker === true;

        return (
            <TouchableWithoutFeedback
                key={`move-${from}-${to}-${index}`}
                onPress={() => !isDestination && !isProcessing && onSelectMove(move)}
                disabled={isProcessing}
            >
                <View
                    style={{
                        position: 'absolute',
                        width: cellSize,
                        height: cellSize,
                        left,
                        bottom,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Svg height={cellSize} width={cellSize}>
                        <Circle
                            cx={cellSize / 2}
                            cy={cellSize / 2}
                            r={cellSize / 6}
                            fill={
                                isDestination
                                    ? `rgba(255, 255, 255, ${0.7 * opacityMultiplier})`
                                    : colors.fillNormal
                            }
                            stroke={
                                isDestination
                                    ? `rgba(230, 230, 230, ${1.0 * opacityMultiplier})`
                                    : colors.strokeNormal
                            }
                            strokeWidth='2'
                        />
                    </Svg>
                </View>
            </TouchableWithoutFeedback>
        );
    });
};

export default Moves;

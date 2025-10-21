import { TouchableWithoutFeedback, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useGamePreferences } from '../contexts/GamePreferencesContext';

const Moves = ({
    visibleMoves,
    size,
    onSelectMove,
    showOrientations = false,
    selectedDestination = null,
    isEnemyMoves = false,
}) => {
    const { isBoardFlipped } = useGamePreferences();
    const cellSize = size / 8;

    // Define colors based on whether these are enemy moves
    const colors = isEnemyMoves
        ? {
              fillLight: 'rgba(255, 0, 0, 0.25)',
              fillNormal: 'rgba(255, 0, 0, 0.5)',
              strokeLight: 'rgba(200, 0, 0, 0.4)',
              strokeNormal: 'rgba(200, 0, 0, 0.8)',
          }
        : {
              fillLight: 'rgba(0, 255, 0, 0.25)',
              fillNormal: 'rgba(0, 255, 0, 0.5)',
              strokeLight: 'rgba(0, 200, 0, 0.4)',
              strokeNormal: 'rgba(0, 200, 0, 0.8)',
          };

    return visibleMoves.map((move, index) => {
        const { to, from, isDestinationMarker } = move;
        const [file, rank] = to.split('');
        const fileIndex = file.charCodeAt(0) - 'a'.charCodeAt(0);
        const left = isBoardFlipped ? (7 - fileIndex) * cellSize : fileIndex * cellSize;
        const bottom = isBoardFlipped ? (8 - parseInt(rank)) * cellSize : (rank - 1) * cellSize;

        // The destination marker should be lighter, adjacent squares should be normal
        const isDestination = isDestinationMarker === true;

        return (
            <TouchableWithoutFeedback
                key={`move-${from}-${to}-${index}`}
                onPress={() => !isDestination && onSelectMove(move)}
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
                            fill={isDestination ? colors.fillLight : colors.fillNormal}
                            stroke={isDestination ? colors.strokeLight : colors.strokeNormal}
                            strokeWidth='2'
                        />
                    </Svg>
                </View>
            </TouchableWithoutFeedback>
        );
    });
};

export default Moves;

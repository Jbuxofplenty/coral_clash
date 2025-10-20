import { TouchableWithoutFeedback, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const Moves = ({
    visibleMoves,
    size,
    onSelectMove,
    showOrientations = false,
    selectedDestination = null,
}) => {
    const cellSize = size / 8;

    return visibleMoves.map((move, index) => {
        const { to, from, isDestinationMarker } = move;
        const [file, rank] = to.split('');
        const left = (file.charCodeAt(0) - 'a'.charCodeAt(0)) * cellSize;
        const bottom = (rank - 1) * cellSize;

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
                            fill={isDestination ? 'rgba(0, 255, 0, 0.25)' : 'rgba(0, 255, 0, 0.5)'}
                            stroke={isDestination ? 'rgba(0, 200, 0, 0.4)' : 'rgba(0, 200, 0, 0.8)'}
                            strokeWidth='2'
                        />
                    </Svg>
                </View>
            </TouchableWithoutFeedback>
        );
    });
};

export default Moves;

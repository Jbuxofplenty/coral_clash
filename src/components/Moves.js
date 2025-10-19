import { TouchableWithoutFeedback, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const Moves = ({ visibleMoves, size, onSelectMove }) => {
    const cellSize = size / 8;

    return visibleMoves.map((move) => {
        const { to } = move;
        const [file, rank] = to.split('');
        const left = (file.charCodeAt(0) - 'a'.charCodeAt(0)) * cellSize;
        const bottom = (rank - 1) * cellSize;

        return (
            <TouchableWithoutFeedback key={`move-${to}`} onPress={() => onSelectMove(move)}>
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
                            fill='rgba(0, 255, 0, 0.5)'
                            stroke='rgba(0, 200, 0, 0.8)'
                            strokeWidth='2'
                        />
                    </Svg>
                </View>
            </TouchableWithoutFeedback>
        );
    });
};

export default Moves;

import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

const LastMoveHighlight = ({ lastMove, size, boardFlipped = false }) => {
    const pulseAnim = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        // Create pulsing animation loop - pulse between 0.4 and 0.9 opacity
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.9,
                    duration: 1200,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.4,
                    duration: 1200,
                    useNativeDriver: true,
                }),
            ]),
        );

        pulseAnimation.start();

        return () => {
            pulseAnimation.stop();
        };
    }, [pulseAnim]);

    if (!lastMove || !lastMove.from || !lastMove.to) {
        return null;
    }

    const cellSize = size / 8;

    const renderSquare = (square, isFrom) => {
        const [file, rank] = square.split('');
        const fileIndex = file.charCodeAt(0) - 'a'.charCodeAt(0);
        const left = boardFlipped ? (7 - fileIndex) * cellSize : fileIndex * cellSize;
        const bottom = boardFlipped
            ? (8 - parseInt(rank)) * cellSize
            : (rank - 1) * cellSize;

        return (
            <Animated.View
                key={`${square}-${isFrom ? 'from' : 'to'}`}
                style={[
                    styles.highlight,
                    {
                        left,
                        bottom,
                        width: cellSize,
                        height: cellSize,
                        backgroundColor: isFrom
                            ? 'rgba(255, 215, 0, 0.25)' // Light gold background
                            : 'rgba(255, 165, 0, 0.3)', // Light orange background
                        borderColor: isFrom ? '#FFD700' : '#FFA500',
                        borderWidth: 2.5,
                        opacity: pulseAnim, // Pulse opacity for glowing effect
                    },
                ]}
            />
        );
    };

    return (
        <>
            {renderSquare(lastMove.from, true)}
            {renderSquare(lastMove.to, false)}
        </>
    );
};

const styles = StyleSheet.create({
    highlight: {
        position: 'absolute',
        pointerEvents: 'none', // Don't intercept touches
    },
});

export default LastMoveHighlight;

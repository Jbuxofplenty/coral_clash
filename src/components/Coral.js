import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SQUARES } from '../../shared';
import { useCoralClashContext } from '../contexts/CoralClashContext';

const Coral = ({
    coralClash: coralClashProp,
    size,
    boardFlipped = false,
    userColor = null,
    updateTrigger = 0,
}) => {
    const coralClashContext = useCoralClashContext();
    // Use prop if provided (for historical view), otherwise use context
    const coralClash = coralClashProp || coralClashContext;
    const cellSize = size / 8;

    // Get all squares with coral - memoized and re-computed when updateTrigger changes
    const coralSquares = useMemo(() => {
        const squares = [];
        SQUARES.forEach((square) => {
            const coralColor = coralClash.getCoral(square);
            if (coralColor) {
                squares.push({ square, color: coralColor });
            }
        });

        return squares;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coralClash, updateTrigger]); // Re-compute when updateTrigger changes (intentional)

    return (
        <>
            {coralSquares.map(({ square, color }) => {
                const [file, rank] = square.split('');
                const fileIndex = file.charCodeAt(0) - 'a'.charCodeAt(0);
                const left = boardFlipped ? (7 - fileIndex) * cellSize : fileIndex * cellSize;
                const bottom = boardFlipped
                    ? (8 - parseInt(rank)) * cellSize
                    : (rank - 1) * cellSize;

                // Use different colors/styles based on whether coral belongs to user or opponent
                // For PvP games (userColor is provided), user's coral is pink, opponent's is black
                // For offline games (no userColor), default to white=pink, black=black
                let coralStyle;
                if (userColor) {
                    // PvP game: user's coral is pink, opponent's is black
                    coralStyle = color === userColor ? styles.coralUser : styles.coralOpponent;
                } else {
                    // Offline game: keep original behavior (white=pink, black=black)
                    coralStyle = color === 'w' ? styles.coralWhite : styles.coralBlack;
                }

                // Add small inset so adjacent borders don't stack/appear thicker
                const inset = cellSize * 0.04;

                return (
                    <View
                        key={`coral-${square}`}
                        style={[
                            styles.coralBorder,
                            coralStyle,
                            {
                                width: cellSize - inset * 2,
                                height: cellSize - inset * 2,
                                left: left + inset,
                                bottom: bottom + inset,
                                borderWidth: cellSize * 0.08,
                                borderRadius: cellSize * 0.15,
                            },
                        ]}
                    />
                );
            })}
        </>
    );
};

const styles = StyleSheet.create({
    coralBorder: {
        position: 'absolute',
        backgroundColor: 'transparent',
    },
    coralWhite: {
        borderColor: '#FF1493', // Deep pink - fully opaque, consistent on all squares
    },
    coralBlack: {
        borderColor: '#1a1a1a', // Solid black - fully opaque, consistent on all squares
    },
    coralUser: {
        borderColor: '#FF1493', // Deep pink - user's coral
    },
    coralOpponent: {
        borderColor: '#1a1a1a', // Solid black - opponent's coral
    },
});

export default Coral;

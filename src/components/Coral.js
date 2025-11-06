import { SQUARES } from '@jbuxofplenty/coral-clash';
import { StyleSheet, View } from 'react-native';
import { useCoralClashContext } from '../contexts/CoralClashContext';

const Coral = ({
    coralClash: coralClashProp,
    size,
    boardFlipped = false,
    userColor = null,
    updateTrigger: _updateTrigger = 0,
    removedCoral = [], // Coral being removed during animation
    placedCoral = [], // Coral being placed (hide during animation, show after)
}) => {
    // Always call the hook to satisfy React's Rules of Hooks
    const coralClashContext = useCoralClashContext();
    // Use prop if provided (for scenario boards), otherwise use context
    const coralClash = coralClashProp || coralClashContext;

    const cellSize = size / 8;

    const coralSquares = [];
    SQUARES.forEach((square) => {
        const coralColor = coralClash.getCoral(square);
        if (coralColor) {
            coralSquares.push({ square, color: coralColor });
        }
    });

    // Filter out coral that's being placed (should be hidden during animation)
    const placedCoralSquares = placedCoral.map((c) => c.square);

    return (
        <>
            {/* Render removed coral during animation */}
            {removedCoral.map(({ square, color }) => {
                const [file, rank] = square.split('');
                const fileIndex = file.charCodeAt(0) - 'a'.charCodeAt(0);
                const left = boardFlipped ? (7 - fileIndex) * cellSize : fileIndex * cellSize;
                const bottom = boardFlipped
                    ? (8 - parseInt(rank)) * cellSize
                    : (rank - 1) * cellSize;

                let coralStyle;
                if (userColor) {
                    coralStyle = color === userColor ? styles.coralUser : styles.coralOpponent;
                } else {
                    coralStyle = color === 'w' ? styles.coralWhite : styles.coralBlack;
                }

                const inset = cellSize * 0.04;

                return (
                    <View
                        key={`removed-coral-${square}`}
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
            {/* Render normal coral (excluding those being placed during animation) */}
            {coralSquares
                .filter(({ square }) => !placedCoralSquares.includes(square))
                .map(({ square, color }) => {
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

import { View, StyleSheet } from 'react-native';
import { SQUARES } from '../../shared';
import { useGamePreferences } from '../contexts/GamePreferencesContext';

const Coral = ({ coralClash, size }) => {
    const { isBoardFlipped } = useGamePreferences();
    const cellSize = size / 8;

    // Get all squares with coral
    const coralSquares = [];
    SQUARES.forEach((square) => {
        const coralColor = coralClash.getCoral(square);
        if (coralColor) {
            coralSquares.push({ square, color: coralColor });
        }
    });

    return (
        <>
            {coralSquares.map(({ square, color }) => {
                const [file, rank] = square.split('');
                const fileIndex = file.charCodeAt(0) - 'a'.charCodeAt(0);
                const left = isBoardFlipped ? (7 - fileIndex) * cellSize : fileIndex * cellSize;
                const bottom = isBoardFlipped
                    ? (8 - parseInt(rank)) * cellSize
                    : (rank - 1) * cellSize;

                // Use different colors/styles for white vs black coral
                const coralStyle = color === 'w' ? styles.coralWhite : styles.coralBlack;

                return (
                    <View
                        key={`coral-${square}`}
                        style={[
                            styles.coralBorder,
                            coralStyle,
                            {
                                width: cellSize,
                                height: cellSize,
                                left: left,
                                bottom: bottom,
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
        // Coral-like irregular border effect
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    coralWhite: {
        borderColor: '#FF6B9D', // Coral pink for white player
        // Add a subtle inner glow effect
        shadowColor: '#FF6B9D',
    },
    coralBlack: {
        borderColor: '#2C3E50', // Dark grey/charcoal for black player
        shadowColor: '#2C3E50',
    },
});

export default Coral;

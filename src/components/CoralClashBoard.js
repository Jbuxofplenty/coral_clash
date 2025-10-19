import { useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import useCoralClash from '../hooks/useCoralClash';
import EmptyBoard from './EmptyBoard';
import Moves from './Moves';
import Pieces from './Pieces';

const useRandomMove = (coralClash) => {
    while (!coralClash.isGameOver() && coralClash.turn() === 'b') {
        const moves = coralClash.moves();
        const move = moves[Math.floor(Math.random() * moves.length)];
        coralClash.move(move);
    }
};

const CoralClash = () => {
    const { width } = useWindowDimensions();
    const coralClash = useCoralClash();
    const [visibleMoves, setVisibleMoves] = useState([]);
    const boardSize = Math.min(width, 400);

    useRandomMove(coralClash);

    const handleSelectPiece = (square) => {
        const moves = coralClash.moves({ square: square, verbose: true });
        setVisibleMoves(moves);
    };

    const handleSelectMove = (move) => {
        // Always promote to queen
        coralClash.move(move.promotion ? { ...move, promotion: 'q' } : move);
        setVisibleMoves([]);
    };
    return (
        <View style={{ position: 'relative' }}>
            <EmptyBoard size={boardSize} />
            <Pieces board={coralClash.board()} onSelectPiece={handleSelectPiece} size={boardSize} />
            <Moves visibleMoves={visibleMoves} onSelectMove={handleSelectMove} size={boardSize} />
        </View>
    );
};

export default CoralClash;

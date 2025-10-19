import PieceImages from '../assets/images/pieces';

import { Image, TouchableWithoutFeedback } from 'react-native';

const Pieces = ({ board, size, onSelectPiece }) => {
    const cellSize = size / 8;
    return board
        .flat()
        .filter((cell) => cell)
        .map((piece) => {
            const { square, type, color } = piece;
            const [file, rank] = square.split('');
            const left = (file.charCodeAt(0) - 'a'.charCodeAt(0)) * cellSize;
            const bottom = (rank - 1) * cellSize;

            // Whale (King) spans 2 squares horizontally
            const isWhale = type.toUpperCase() === 'K';
            const pieceWidth = isWhale ? cellSize * 2 : cellSize;

            // Determine if piece should have coral decoration
            // Crabs (Pawns) on c,h files for white get coral
            // Crabs (Pawns) on a,f files for black get coral
            // Octopuses (Bishops) on b,e files for white get coral
            // Octopuses (Bishops) on d,g files for black get coral
            // Pufferfish (Rooks) on h file for white get coral
            // Pufferfish (Rooks) on a file for black get coral
            // Dolphins (Queens) on e file for white get coral
            // Dolphins (Queens) on d file for black get coral
            const isCrab = type.toUpperCase() === 'P'; // Pawn = Crab
            const isOctopus = type.toUpperCase() === 'B'; // Bishop = Octopus
            const isPufferfish = type.toUpperCase() === 'R'; // Rook = Pufferfish
            const isDolphin = type.toUpperCase() === 'Q'; // Queen = Dolphin

            const isWhiteWithCoral =
                color === 'w' &&
                ((isCrab && (file === 'c' || file === 'h')) ||
                    (isOctopus && (file === 'b' || file === 'e')) ||
                    (isPufferfish && file === 'h') ||
                    (isDolphin && file === 'e'));

            const isBlackWithCoral =
                color === 'b' &&
                ((isCrab && (file === 'a' || file === 'f')) ||
                    (isOctopus && (file === 'd' || file === 'g')) ||
                    (isPufferfish && file === 'a') ||
                    (isDolphin && file === 'd'));

            const hasCoral = isWhiteWithCoral || isBlackWithCoral;

            const pieceKey = hasCoral
                ? `${color}${type}C`.toUpperCase()
                : `${color}${type}`.toUpperCase();

            return (
                <TouchableWithoutFeedback
                    key={`piece-${square}`}
                    onPress={() => onSelectPiece(square)}
                >
                    <Image
                        style={{
                            position: 'absolute',
                            width: pieceWidth,
                            height: cellSize,
                            left,
                            bottom,
                        }}
                        source={PieceImages[pieceKey]}
                        resizeMode='contain'
                    />
                </TouchableWithoutFeedback>
            );
        });
};

export default Pieces;

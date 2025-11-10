import { Block, Text } from 'galio-framework';
import { FlatGrid } from 'react-native-super-grid';

const BOARD_SIZE = 8;
const RANKS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const FILES = ['8', '7', '6', '5', '4', '3', '2', '1'];

const EmptyBoard = ({ size, boardFlipped = false }) => {
    const squareSize = size / BOARD_SIZE;
    const displayFiles = boardFlipped ? [...FILES].reverse() : FILES;
    const displayRanks = boardFlipped ? [...RANKS].reverse() : RANKS;

    // Calculate responsive font size for coordinate labels
    // Scale proportionally with square size, with min of 10 and max of 18
    const coordinateFontSize = Math.max(10, Math.min(squareSize * 0.18, 18));

    return (
        <Block
            height={size}
            width={size}
            backgroundColor='#ccc'
            borderRadius='1%'
            overflow='hidden'
        >
            <FlatGrid
                staticDimension={size}
                itemDimension={squareSize}
                fixed
                spacing={0}
                scrollEnabled={false}
                data={[...Array(BOARD_SIZE * BOARD_SIZE).keys()]}
                renderItem={({ item: index }) => {
                    const col = Math.floor(index / BOARD_SIZE);
                    const row = index % BOARD_SIZE;
                    const color = (row + col) % 2 === 0 ? '#e8d7c3' : '#5b8fa3';
                    const textColor = (row + col) % 2 === 0 ? '#5b8fa3' : '#e8d7c3';

                    // Show rank number (8-1) in bottom-left corner of first column
                    const showRank = col === 7;
                    // Show file letter (a-h) in bottom-left corner of last row
                    const showFile = row === 0;

                    return (
                        <Block
                            key={index.toString()}
                            height={squareSize}
                            width={squareSize}
                            backgroundColor={color}
                            style={{ position: 'relative' }}
                        >
                            {showRank && (
                                <Text
                                    size={coordinateFontSize}
                                    color={textColor}
                                    style={{
                                        position: 'absolute',
                                        bottom: 2,
                                        right: 2,
                                        fontWeight: 'bold',
                                        opacity: 0.8,
                                    }}
                                >
                                    {displayRanks[row]}
                                </Text>
                            )}
                            {showFile && (
                                <Text
                                    size={coordinateFontSize}
                                    color={textColor}
                                    style={{
                                        position: 'absolute',
                                        top: 2,
                                        left: 2,
                                        fontWeight: 'bold',
                                        opacity: 0.8,
                                    }}
                                >
                                    {displayFiles[col]}
                                </Text>
                            )}
                        </Block>
                    );
                }}
            />
        </Block>
    );
};

export default EmptyBoard;

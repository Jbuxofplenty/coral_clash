import { Block } from 'galio-framework';
import { FlatGrid } from 'react-native-super-grid';

const BOARD_SIZE = 8;

const EmptyBoard = ({ size }) => {
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
                itemDimension={size / BOARD_SIZE}
                fixed
                spacing={0}
                scrollEnabled={false}
                data={[...Array(BOARD_SIZE * BOARD_SIZE).keys()]}
                renderItem={({ item: index }) => {
                    const col = Math.floor(index / BOARD_SIZE);
                    const row = index % BOARD_SIZE;
                    const color = (row + col) % 2 === 0 ? '#eeeed2' : '#769656';
                    return (
                        <Block
                            key={index.toString()}
                            height={size / BOARD_SIZE}
                            width={size / BOARD_SIZE}
                            backgroundColor={color}
                        />
                    );
                }}
            />
        </Block>
    );
};

export default EmptyBoard;

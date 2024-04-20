import { useState } from 'react';
import { Chess, ChessInstance } from './coralClash';

const useCoralClash = () => {
    const [coralClashInstance] = useState<ChessInstance | undefined>(new Chess());

    return coralClashInstance;
};

export default useCoralClash;

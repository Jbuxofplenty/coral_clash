import { useState } from 'react';
import { CoralClash, CoralClashInstance } from './coralClash';

const useCoralClash = () => {
    const [coralClashInstance] = useState<CoralClashInstance | undefined>(new CoralClash());

    return coralClashInstance;
};

export default useCoralClash;

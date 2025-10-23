import { useState } from 'react';
import { Dimensions, Platform } from 'react-native';
import { CoralClash, CoralClashInstance } from '../../shared';

const useCoralClash = (): CoralClashInstance => {
    const [coralClashInstance] = useState<CoralClashInstance>(() => new CoralClash());

    return coralClashInstance;
};

export default useCoralClash;

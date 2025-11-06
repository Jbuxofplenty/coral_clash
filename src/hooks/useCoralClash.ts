import { CoralClash, CoralClashInstance, GAME_VERSION } from '@jbuxofplenty/coral-clash';
import { useState } from 'react';

export { GAME_VERSION };

const useCoralClash = (): CoralClashInstance => {
    const [coralClashInstance] = useState<CoralClashInstance>(() => new CoralClash());

    return coralClashInstance;
};

export default useCoralClash;

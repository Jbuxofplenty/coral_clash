import React, { createContext, useContext } from 'react';

const CoralClashContext = createContext(null);

export const CoralClashProvider = ({ value, children }) => {
    return <CoralClashContext.Provider value={value}>{children}</CoralClashContext.Provider>;
};

export const useCoralClashContext = () => {
    const context = useContext(CoralClashContext);
    if (!context) {
        throw new Error('useCoralClashContext must be used within a CoralClashProvider');
    }
    return context;
};

import React, { createContext, useContext } from 'react';

const CoralClashContext = createContext(null);

export const CoralClashProvider = ({ value, children }) => {
    return <CoralClashContext.Provider value={value}>{children}</CoralClashContext.Provider>;
};

export const useCoralClashContext = () => {
    const context = useContext(CoralClashContext);
    // Allow null context - components can receive coralClash as prop instead
    // Only throw error if context is required but not provided
    return context;
};

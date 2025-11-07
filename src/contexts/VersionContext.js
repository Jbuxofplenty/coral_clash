import React, { createContext, useCallback, useContext, useState } from 'react';

const VersionContext = createContext();

/**
 * Version Context Provider
 * Manages version mismatch warnings across the app
 */
export const VersionProvider = ({ children }) => {
    const [versionWarning, setVersionWarning] = useState({
        visible: false,
        serverVersion: null,
        clientVersion: null,
    });

    /**
     * Check version compatibility from server response
     * @param {Object} versionCheck - Version check object from server
     */
    const checkVersion = useCallback((versionCheck) => {
        if (!versionCheck) return;

        if (versionCheck.requiresUpdate) {
            console.warn('[VersionContext] Client version outdated:', {
                client: versionCheck.clientVersion,
                server: versionCheck.serverVersion,
            });

            setVersionWarning({
                visible: true,
                serverVersion: versionCheck.serverVersion,
                clientVersion: versionCheck.clientVersion,
            });
        }
    }, []);

    /**
     * Dismiss version warning
     */
    const dismissWarning = useCallback(() => {
        setVersionWarning((prev) => ({ ...prev, visible: false }));
    }, []);

    /**
     * Clear all version warnings
     */
    const clearWarning = useCallback(() => {
        setVersionWarning({
            visible: false,
            serverVersion: null,
            clientVersion: null,
        });
    }, []);

    return (
        <VersionContext.Provider
            value={{
                versionWarning,
                checkVersion,
                dismissWarning,
                clearWarning,
            }}
        >
            {children}
        </VersionContext.Provider>
    );
};

export const useVersion = () => {
    const context = useContext(VersionContext);
    if (!context) {
        throw new Error('useVersion must be used within a VersionProvider');
    }
    return context;
};


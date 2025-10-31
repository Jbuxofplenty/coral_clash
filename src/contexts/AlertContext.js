import React, { createContext, useContext, useState } from 'react';
import ThemedAlert from '../components/ThemedAlert';

const AlertContext = createContext({});

export const useAlert = () => {
    const context = useContext(AlertContext);
    if (!context) {
        throw new Error('useAlert must be used within AlertProvider');
    }
    return context;
};

export function AlertProvider({ children }) {
    const [alertState, setAlertState] = useState({
        visible: false,
        title: '',
        message: '',
        buttons: [],
        vertical: false,
    });

    /**
     * Show a themed alert dialog
     * @param {string} title - Alert title
     * @param {string} message - Alert message
     * @param {Array} buttons - Array of button objects with text, onPress, and style properties
     * @param {boolean} vertical - Whether to stack buttons vertically (default: false)
     *
     * Example:
     * showAlert('Delete Item', 'Are you sure?', [
     *   { text: 'Cancel', style: 'cancel' },
     *   { text: 'Delete', style: 'destructive', onPress: () => deleteItem() }
     * ])
     */
    const showAlert = (title, message, buttons = [{ text: 'OK' }], vertical = false) => {
        setAlertState({
            visible: true,
            title,
            message,
            buttons,
            vertical,
        });
    };

    const dismissAlert = () => {
        setAlertState({
            visible: false,
            title: '',
            message: '',
            buttons: [],
            vertical: false,
        });
    };

    return (
        <AlertContext.Provider value={{ showAlert }}>
            {children}
            <ThemedAlert
                visible={alertState.visible}
                title={alertState.title}
                message={alertState.message}
                buttons={alertState.buttons}
                onDismiss={dismissAlert}
                vertical={alertState.vertical}
            />
        </AlertContext.Provider>
    );
}

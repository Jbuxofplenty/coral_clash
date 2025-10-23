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
    });

    /**
     * Show a themed alert dialog
     * @param {string} title - Alert title
     * @param {string} message - Alert message
     * @param {Array} buttons - Array of button objects with text, onPress, and style properties
     *
     * Example:
     * showAlert('Delete Item', 'Are you sure?', [
     *   { text: 'Cancel', style: 'cancel' },
     *   { text: 'Delete', style: 'destructive', onPress: () => deleteItem() }
     * ])
     */
    const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
        setAlertState({
            visible: true,
            title,
            message,
            buttons,
        });
    };

    const dismissAlert = () => {
        setAlertState({
            visible: false,
            title: '',
            message: '',
            buttons: [],
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
            />
        </AlertContext.Provider>
    );
}

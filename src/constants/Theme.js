const LIGHT_COLORS = {
    DEFAULT: '#DCDCDC',
    PRIMARY: '#1e88e5',
    SECONDARY: '#2a5298',
    LABEL: '#FE2472',
    INFO: '#00BCD4',
    ERROR: '#F44336',
    SUCCESS: '#4CAF50',
    WARNING: '#FF9800',
    MUTED: '#979797',
    INPUT: '#DCDCDC',
    ACTIVE: '#1e88e5',
    BUTTON_COLOR: '#1e88e5',
    PLACEHOLDER: '#9FA5AA',
    SWITCH_ON: '#1e88e5',
    SWITCH_OFF: '#D4D9DD',
    GRADIENT_START: '#1e3c72',
    GRADIENT_MID: '#2a5298',
    GRADIENT_END: '#7e8ba3',
    PRICE_COLOR: '#EAD5FB',
    BORDER_COLOR: '#E7E7E7',
    BLOCK: '#E7E7E7',
    ICON: '#4A4A4A',
    TEXT: '#212121',
    TEXT_SECONDARY: '#757575',
    BACKGROUND: '#f9f9f9',
    CARD_BACKGROUND: '#FFFFFF',
    DRAWER_BACKGROUND: '#1e3c72',
    SHADOW: '#000000',
    WHITE: '#FFFFFF',
    BLACK: '#000000',
};

const DARK_COLORS = {
    DEFAULT: '#2C2C2C',
    PRIMARY: '#64b5f6',
    SECONDARY: '#5a7db5',
    LABEL: '#FF6B9D',
    INFO: '#4DD0E1',
    ERROR: '#EF5350',
    SUCCESS: '#66BB6A',
    WARNING: '#FFA726',
    MUTED: '#B0B0B0',
    INPUT: '#3A3A3A',
    ACTIVE: '#64b5f6',
    BUTTON_COLOR: '#64b5f6',
    PLACEHOLDER: '#808080',
    SWITCH_ON: '#64b5f6',
    SWITCH_OFF: '#424242',
    GRADIENT_START: '#0a1929',
    GRADIENT_MID: '#1a2f4a',
    GRADIENT_END: '#2a4a6a',
    PRICE_COLOR: '#4A3861',
    BORDER_COLOR: '#424242',
    BLOCK: '#2C2C2C',
    ICON: '#E0E0E0',
    TEXT: '#FFFFFF',
    TEXT_SECONDARY: '#B0B0B0',
    BACKGROUND: '#121212',
    CARD_BACKGROUND: '#000000',
    DRAWER_BACKGROUND: '#0a1929',
    SHADOW: '#000000',
    WHITE: '#FFFFFF',
    BLACK: '#000000',
};

export const LIGHT_THEME = {
    COLORS: LIGHT_COLORS,
    SIZES: {
        BLOCK_SHADOW_RADIUS: 2,
    },
};

export const DARK_THEME = {
    COLORS: DARK_COLORS,
    SIZES: {
        BLOCK_SHADOW_RADIUS: 2,
    },
};

// Default export for backward compatibility
export default LIGHT_THEME;

// Helper function to get theme colors based on dark mode
export const getThemeColors = (isDarkMode) => {
    return isDarkMode ? DARK_COLORS : LIGHT_COLORS;
};

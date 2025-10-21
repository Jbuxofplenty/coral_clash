const homeImage = require('../assets/images/home.png');

const products = [
    {
        title: 'Play Coral Clash vs Computer',
        description: 'Start a new game against the AI',
        image: homeImage,
        horizontal: true,
        icon: 'desktop',
        iconFamily: 'font-awesome',
    },
];

// Dev-only fixtures card
const devProducts = [
    {
        title: 'Load Game State (Dev)',
        description: 'Load a saved game state from fixtures',
        horizontal: true,
        icon: 'folder-open',
        iconFamily: 'font-awesome',
        isDevFixtureLoader: true,
    },
];

// Export products with dev card when dev features are enabled
const enableDevFeatures = process.env.EXPO_PUBLIC_ENABLE_DEV_FEATURES === 'true';
export default enableDevFeatures ? [...products, ...devProducts] : products;

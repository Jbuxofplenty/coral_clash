import { db, doc, getDoc } from '../config/firebase';

/**
 * @typedef {'ads'} FeatureFlagName
 * Available feature flags:
 * - 'ads': Controls ads mode ('enabled' | 'test' | 'disabled')
 */

/**
 * @typedef {Object} FeatureFlagConfig
 * @property {string} collection - Firestore collection name
 * @property {FeatureFlagName} documentId - Firestore document ID
 * @property {string} field - Field name in the document
 * @property {any[]} validValues - Array of valid values for validation
 * @property {any} fallback - Fallback value if Firestore fails
 * @property {number} cacheTTL - Cache time-to-live in milliseconds
 */

// Cache storage for feature flags
const featureFlagCache = new Map();
const featureFlagCacheTime = new Map();

/**
 * Generic function to get a feature flag from Firestore with caching and fallback
 *
 * @template T
 * @param {FeatureFlagName} flagName - The name of the feature flag
 * @param {FeatureFlagConfig} config - Configuration for the feature flag
 * @returns {Promise<T>} The feature flag value
 */
export const getFeatureFlag = async (flagName, config) => {
    const {
        collection = 'featureFlags',
        documentId,
        field,
        validValues,
        fallback,
        cacheTTL = 5 * 60 * 1000, // Default 5 minutes
    } = config;

    // Check cache first
    const now = Date.now();
    const cachedValue = featureFlagCache.get(flagName);
    const cacheTime = featureFlagCacheTime.get(flagName) || 0;

    if (cachedValue !== undefined && now - cacheTime < cacheTTL) {
        return cachedValue;
    }

    try {
        // Try to get from Firestore
        const flagRef = doc(db, collection, documentId);
        const flagDoc = await getDoc(flagRef);

        if (flagDoc.exists()) {
            const data = flagDoc.data();
            const value = data[field];

            // Validate the value
            if (validValues.includes(value)) {
                // Cache the valid value
                featureFlagCache.set(flagName, value);
                featureFlagCacheTime.set(flagName, now);
                return value;
            } else {
                console.warn(
                    `⚠️ Invalid value for feature flag '${flagName}':`,
                    value,
                    'Expected one of:',
                    validValues,
                );
            }
        } else {
            console.warn(`⚠️ Feature flag document '${collection}/${documentId}' does not exist`);
        }
    } catch (error) {
        console.warn(
            `⚠️ Failed to fetch feature flag '${flagName}' from Firestore, using fallback:`,
            error.message,
        );
    }

    // Fallback
    return fallback;
};

/**
 * Clear the cache for a specific feature flag or all flags
 * @param {FeatureFlagName} [flagName] - Optional flag name to clear. If not provided, clears all.
 */
export const clearFeatureFlagCache = (flagName) => {
    if (flagName) {
        featureFlagCache.delete(flagName);
        featureFlagCacheTime.delete(flagName);
    } else {
        featureFlagCache.clear();
        featureFlagCacheTime.clear();
    }
};

/**
 * Get the ads mode feature flag from Firestore with fallback to environment
 * @returns {Promise<'enabled' | 'test' | 'disabled'>} The ads mode
 */
export const getAdsMode = async () => {
    const envFallback = process.env.EXPO_PUBLIC_ADS_MODE || 'disabled';
    const validatedFallback = ['enabled', 'test', 'disabled'].includes(envFallback)
        ? envFallback
        : 'disabled';

    return getFeatureFlag('ads', {
        documentId: 'ads',
        field: 'mode',
        validValues: ['enabled', 'test', 'disabled'],
        fallback: validatedFallback,
        cacheTTL: Infinity, // Cache for entire app session
    });
};

/**
 * Initialize ads mode feature flag on app startup
 * Call this once during app initialization to pre-fetch and cache the ads mode
 * @returns {Promise<'enabled' | 'test' | 'disabled'>} The ads mode
 */
export const initializeAdsMode = async () => {
    const mode = await getAdsMode();
    return mode;
};


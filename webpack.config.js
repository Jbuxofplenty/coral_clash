const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
    return await createExpoWebpackConfigAsync(
        {
            ...env,
            babel: {
                dangerouslyAddModulePathsToTranspile: ['dripsy', '@dripsy'],
            },
            resolve: {
                fallback: {
                    crypto: require.resolve('expo-crypto'),
                }
            }
        },
        argv
    );
};

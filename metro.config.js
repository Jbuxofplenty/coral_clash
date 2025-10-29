const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Custom resolver to handle .js imports that should resolve to .ts files
config.resolver.resolveRequest = (context, moduleName, platform) => {
    // If the import ends with .js, try resolving without the extension
    if (moduleName.endsWith('.js')) {
        // Remove the .js extension and let Metro's default resolution handle it
        const withoutExtension = moduleName.replace(/\.js$/, '');
        try {
            return context.resolveRequest(context, withoutExtension, platform);
        } catch (_error) {
            // If that fails, continue with original module name
        }
    }

    // Fall back to the default resolution
    return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

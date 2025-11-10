const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Support for local yarn linked @jbuxofplenty/coral-clash package
// Only enable when the package is actually linked (symlink exists in node_modules)
const nodeModulesPackagePath = path.resolve(__dirname, 'node_modules/@jbuxofplenty/coral-clash');
const isLinked = fs.existsSync(nodeModulesPackagePath) && fs.lstatSync(nodeModulesPackagePath).isSymbolicLink();

if (isLinked) {
    const sharedPath = path.resolve(__dirname, 'shared');
    config.watchFolders = [sharedPath];
    config.resolver.extraNodeModules = {
        ...config.resolver.extraNodeModules,
        '@jbuxofplenty/coral-clash': sharedPath,
    };
    console.log('📦 Metro: Using local linked @jbuxofplenty/coral-clash from ./shared');
} else {
    console.log('📦 Metro: Using published @jbuxofplenty/coral-clash from node_modules');
}

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

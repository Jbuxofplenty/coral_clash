const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to automatically add `use_modular_headers!` to Podfile
 * This is required for Firebase Analytics and other Swift pods that depend on
 * Objective-C pods without module maps when building as static libraries.
 *
 * @param {import('@expo/config-types').ExpoConfig} config
 * @returns {import('@expo/config-types').ExpoConfig}
 */
const withModularHeaders = (config) => {
    return withDangerousMod(config, [
        'ios',
        async (config) => {
            const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');

            // Only modify if Podfile exists (it will after prebuild)
            if (!fs.existsSync(podfilePath)) {
                console.log('⚠️  Podfile not found, skipping modular headers plugin');
                return config;
            }

            let podfileContent = fs.readFileSync(podfilePath, 'utf8');

            // Check if use_modular_headers! already exists
            if (podfileContent.includes('use_modular_headers!')) {
                console.log('✅ use_modular_headers! already present in Podfile');
                return config;
            }

            // Find the target block and add use_modular_headers! after use_expo_modules!
            // Pattern: target 'AppName' do\n  use_expo_modules!
            const targetPattern = /(target\s+['"][^'"]+['"]\s+do\s*\n\s*use_expo_modules!)/;

            if (targetPattern.test(podfileContent)) {
                podfileContent = podfileContent.replace(
                    targetPattern,
                    '$1\n  use_modular_headers!',
                );

                fs.writeFileSync(podfilePath, podfileContent, 'utf8');
                console.log('✅ Added use_modular_headers! to Podfile');
            } else {
                console.warn(
                    '⚠️  Could not find target block in Podfile, manual addition may be required',
                );
            }

            return config;
        },
    ]);
};

module.exports = withModularHeaders;

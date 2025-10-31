const { withAppDelegate } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to fix bundle loading for Expo SDK 52+
 *
 * The default AppDelegate looks for 'main.jsbundle' but Expo SDK 52's
 * export:embed creates bundles in '_expo/static/js/ios/AppEntry-[hash].hbc' format.
 * This plugin updates the bundleURL() method to read from metadata.json.
 */
module.exports = function withFixedBundleURL(config) {
    return withAppDelegate(config, (config) => {
        const contents = config.modResults.contents;

        // Find and replace the bundleURL() method including its closing brace
        const oldBundleMethod = /override func bundleURL\(\) -> URL\? \{[\s\S]*?\n  \}/;

        const newBundleMethod = `override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    // For Expo SDK 52+, use Expo's embedded bundle from metadata
    if let metadataURL = Bundle.main.url(forResource: "metadata", withExtension: "json"),
       let metadataData = try? Data(contentsOf: metadataURL),
       let metadata = try? JSONSerialization.jsonObject(with: metadataData) as? [String: Any],
       let fileMetadata = metadata["fileMetadata"] as? [String: Any],
       let iosMetadata = fileMetadata["ios"] as? [String: Any],
       let bundlePath = iosMetadata["bundle"] as? String {
      return Bundle.main.url(forResource: bundlePath, withExtension: nil)
    }
    // Fallback to legacy location
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }`;

        config.modResults.contents = contents.replace(oldBundleMethod, newBundleMethod);

        return config;
    });
};

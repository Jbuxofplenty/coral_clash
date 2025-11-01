const { withAppDelegate } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to fix bundle loading for Expo SDK 52+
 *
 * The default AppDelegate looks for 'main.jsbundle' but Expo SDK 52's
 * export:embed creates bundles in '_expo/static/js/ios/' format.
 * This plugin updates the bundleURL() method to properly find the bundle.
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
    // For Expo SDK 52+, try multiple approaches to find the bundle
    
    // Method 1: Read from metadata.json and construct full path
    if let metadataURL = Bundle.main.url(forResource: "metadata", withExtension: "json"),
       let metadataData = try? Data(contentsOf: metadataURL),
       let metadata = try? JSONSerialization.jsonObject(with: metadataData) as? [String: Any],
       let fileMetadata = metadata["fileMetadata"] as? [String: Any],
       let iosMetadata = fileMetadata["ios"] as? [String: Any],
       let bundlePath = iosMetadata["bundle"] as? String,
       let bundleResourceURL = Bundle.main.resourceURL {
      // Construct full path from bundle resource directory
      let fullBundleURL = bundleResourceURL.appendingPathComponent(bundlePath)
      if FileManager.default.fileExists(atPath: fullBundleURL.path) {
        return fullBundleURL
      }
    }
    
    // Method 2: Scan for .hbc files in _expo directory
    if let bundleResourceURL = Bundle.main.resourceURL {
      let expoStaticPath = bundleResourceURL.appendingPathComponent("_expo/static/js/ios")
      if let enumerator = FileManager.default.enumerator(at: expoStaticPath, includingPropertiesForKeys: [.isRegularFileKey], options: [.skipsHiddenFiles]) {
        for case let fileURL as URL in enumerator {
          if fileURL.pathExtension == "hbc" && fileURL.lastPathComponent.hasPrefix("AppEntry") {
            return fileURL
          }
        }
      }
    }
    
    // Method 3: Legacy fallback
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }`;

        config.modResults.contents = contents.replace(oldBundleMethod, newBundleMethod);

        return config;
    });
};

const { withAndroidManifest } = require('@expo/config-plugins');

function withAndroidAdOptimization(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];

    // Ensure meta-data array exists
    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    // Add OPTIMIZE_INITIALIZATION
    const hasOptimizeInit = application['meta-data'].some(
      (m) => m.$['android:name'] === 'com.google.android.gms.ads.flag.OPTIMIZE_INITIALIZATION'
    );
    if (!hasOptimizeInit) {
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.android.gms.ads.flag.OPTIMIZE_INITIALIZATION',
          'android:value': 'true',
        },
      });
    }

    // Add OPTIMIZE_AD_LOADING
    const hasOptimizeAdLoading = application['meta-data'].some(
      (m) => m.$['android:name'] === 'com.google.android.gms.ads.flag.OPTIMIZE_AD_LOADING'
    );
    if (!hasOptimizeAdLoading) {
      application['meta-data'].push({
        $: {
          'android:name': 'com.google.android.gms.ads.flag.OPTIMIZE_AD_LOADING',
          'android:value': 'true',
        },
      });
    }

    return config;
  });
}

module.exports = withAndroidAdOptimization;

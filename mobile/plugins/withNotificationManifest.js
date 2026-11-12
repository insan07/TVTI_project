const path = require('path');
const { withFinalizedMod, AndroidConfig } = require('expo/config-plugins');

function fixManifest(document) {
  const manifest = document.manifest;
  manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
  for (const item of manifest.application?.[0]?.['meta-data'] || []) {
    const name = item.$['android:name'];
    const attribute = name === 'com.google.firebase.messaging.default_notification_channel_id' ? 'android:value' : name === 'com.google.firebase.messaging.default_notification_color' ? 'android:resource' : null;
    if (attribute) item.$['tools:replace'] = [...new Set([...(item.$['tools:replace'] || '').split(',').filter(Boolean), attribute])].join(',');
  }
  return document;
}
// Run after Expo Notifications has finished adding its application metadata.
module.exports = config => withFinalizedMod(config, ['android', async next => {
  const file = path.join(next.modRequest.platformProjectRoot, 'app/src/main/AndroidManifest.xml');
  await AndroidConfig.Manifest.writeAndroidManifestAsync(file, fixManifest(await AndroidConfig.Manifest.readAndroidManifestAsync(file)));
  return next;
}]);
module.exports.fixManifest = fixManifest;

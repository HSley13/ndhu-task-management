/**
 * Expo config plugin: registers expo.modules.filesystem.FileSystemFileProvider
 * in the Android manifest and creates the required file_provider_paths.xml.
 *
 * Without this, FileSystem.getContentUriAsync() (used in AttachmentRow to open
 * files stored in the app's document directory on Android 7+) throws because
 * there is no FileProvider registered to convert file:// → content:// URIs.
 *
 * expo-file-system's own app.plugin.js deliberately does NOT add the provider
 * (it only adds permissions), so this plugin fills that gap.
 */
const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const FILE_PROVIDER_PATHS_XML = `<?xml version="1.0" encoding="utf-8"?>
<paths>
  <files-path name="internal-files" path="." />
  <cache-path name="internal-cache" path="." />
  <external-files-path name="external-files" path="." />
  <external-cache-path name="external-cache" path="." />
</paths>
`;

/** Step 1: write res/xml/file_provider_paths.xml */
function withFileProviderPaths(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const xmlDir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(path.join(xmlDir, 'file_provider_paths.xml'), FILE_PROVIDER_PATHS_XML, 'utf-8');
      return cfg;
    },
  ]);
}

/** Step 2: add <provider> and <queries> entries to AndroidManifest.xml */
function withFileProviderManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = manifest.manifest.application?.[0];
    if (!app) return cfg;

    // Ensure provider list exists
    if (!app.provider) app.provider = [];

    const PROVIDER_NAME = 'expo.modules.filesystem.FileSystemFileProvider';
    const alreadyAdded = app.provider.some(
      (p) => p.$?.['android:name'] === PROVIDER_NAME,
    );

    if (!alreadyAdded) {
      app.provider.push({
        $: {
          'android:name': PROVIDER_NAME,
          'android:authorities': '${applicationId}.FileSystemFileProvider',
          'android:exported': 'false',
          'android:grantUriPermissions': 'true',
        },
        'meta-data': [
          {
            $: {
              'android:name': 'android.support.FILE_PROVIDER_PATHS',
              'android:resource': '@xml/file_provider_paths',
            },
          },
        ],
      });
    }

    // Ensure <queries> includes ACTION_VIEW for content:// and file:// URIs
    if (!manifest.manifest.queries) manifest.manifest.queries = [];
    const queries = manifest.manifest.queries[0] ?? {};
    manifest.manifest.queries[0] = queries;
    if (!queries.intent) queries.intent = [];

    const schemes = ['content', 'file'];
    for (const scheme of schemes) {
      const exists = queries.intent.some(
        (i) => i?.data?.[0]?.$?.['android:scheme'] === scheme &&
                !i?.category,
      );
      if (!exists) {
        queries.intent.push({
          action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
          data: [{ $: { 'android:scheme': scheme } }],
        });
      }
    }

    return cfg;
  });
}

module.exports = (config) => {
  config = withFileProviderPaths(config);
  config = withFileProviderManifest(config);
  return config;
};

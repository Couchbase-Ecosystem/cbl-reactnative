const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const { withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const EDITIONS = {
  CE: {
    android: 'com.couchbase.lite:couchbase-lite-android-ktx',
    ios: 'CouchbaseLite-Swift',
  },
  EE: {
    android: 'com.couchbase.lite:couchbase-lite-android-ee-ktx',
    ios: 'CouchbaseLite-Enterprise-Swift',
  },
};

const VERSION = '3.2.1';

function readEditionConfig(projectRoot) {
  try {
    const configPath = path.join(projectRoot, 'cbl-edition.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return config.edition || 'CE';
    }
  } catch (error) {
    console.log('No cbl-edition.json found, using default CE edition');
  }
  return 'CE';
}

const withCouchbaseLiteAndroid = (config, { edition }) => {
  return withAppBuildGradle(config, (config) => {
    const dependency = EDITIONS[edition].android;

    config.modResults.contents = config.modResults.contents.replace(
      /dependencies\s*{/,
      `dependencies {
    // Couchbase Lite Edition Override
    configurations.all {
        resolutionStrategy {
            force "${dependency}:${VERSION}"
        }
    }
`
    );

    return config;
  });
};

const withCouchbaseLiteIOS = (config, { edition }) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const dependency = EDITIONS[edition].ios;
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );

      if (fs.existsSync(podfilePath)) {
        let podfile = fs.readFileSync(podfilePath, 'utf8');

        // Remove any existing Couchbase pod overrides
        podfile = podfile.replace(
          /\n\s*# Couchbase Lite Edition Override[\s\S]*?pod 'CouchbaseLite[^']*'[^\n]*\n/g,
          ''
        );

        // Add the correct pod
        const podOverride = `\n  # Couchbase Lite Edition Override\n  pod '${dependency}', '${VERSION}', :modular_headers => true\n`;

        // Add before use_react_native!
        podfile = podfile.replace(/(use_react_native!)/, `${podOverride}  $1`);

        // Add EE source if needed
        if (edition === 'EE') {
          if (
            !podfile.includes(
              'https://github.com/couchbase/couchbase-lite-ios-ee.git'
            )
          ) {
            podfile = `source 'https://github.com/couchbase/couchbase-lite-ios-ee.git'\n${podfile}`;
          }
        }

        fs.writeFileSync(podfilePath, podfile);
      }

      return config;
    },
  ]);
};

function withCouchbaseLite(config, props = {}) {
  // First try to read from props, then from config file
  let edition = props.edition;

  if (!edition) {
    const projectRoot = config._internal?.projectRoot || process.cwd();
    edition = readEditionConfig(projectRoot);
  }

  edition = edition?.toUpperCase() || 'CE';

  if (!EDITIONS[edition]) {
    throw new Error(
      `Invalid Couchbase Lite edition: ${edition}. Use 'CE' or 'EE'.`
    );
  }

  return withPlugins(config, [
    [withCouchbaseLiteAndroid, { edition }],
    [withCouchbaseLiteIOS, { edition }],
  ]);
}

module.exports = withCouchbaseLite;

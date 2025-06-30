#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EDITIONS = {
  CE: {
    android: 'com.couchbase.lite:couchbase-lite-android-ktx',
    ios: 'CouchbaseLite-Swift',
    name: 'Community',
  },
  EE: {
    android: 'com.couchbase.lite:couchbase-lite-android-ee-ktx',
    ios: 'CouchbaseLite-Enterprise-Swift',
    name: 'Enterprise',
  },
};

function findProjectRoot() {
  let currentDir = process.cwd();

  // If we're in node_modules, go up to the project root
  if (currentDir.includes('node_modules')) {
    while (currentDir.includes('node_modules')) {
      currentDir = path.dirname(currentDir);
    }
    return currentDir;
  }

  // Otherwise, look for package.json
  while (currentDir !== '/') {
    if (fs.existsSync(path.join(currentDir, 'package.json'))) {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(currentDir, 'package.json'), 'utf8')
      );
      if (
        pkg.dependencies?.['react-native'] ||
        pkg.devDependencies?.['react-native']
      ) {
        return currentDir;
      }
    }
    currentDir = path.dirname(currentDir);
  }

  return process.cwd();
}

function detectProjectType(projectRoot) {
  const hasAppJson = fs.existsSync(path.join(projectRoot, 'app.json'));
  const hasAppConfig = fs.existsSync(path.join(projectRoot, 'app.config.js'));
  const hasExpoPackage = (() => {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8')
      );
      return !!(pkg.dependencies?.expo || pkg.devDependencies?.expo);
    } catch {
      return false;
    }
  })();

  return hasAppJson || hasAppConfig || hasExpoPackage ? 'expo' : 'react-native';
}

function saveEditionConfig(projectRoot, edition) {
  const config = {
    edition: edition.toUpperCase(),
    version: '3.2.1',
    timestamp: new Date().toISOString(),
  };

  const configPath = path.join(projectRoot, 'cbl-edition.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  // Update .gitignore if it exists
  const gitignorePath = path.join(projectRoot, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignore.includes('cbl-edition.json')) {
      fs.appendFileSync(
        gitignorePath,
        '\n# Couchbase Lite configuration\ncbl-edition.json\n'
      );
    }
  }
}

function configureExpoProject(projectRoot, edition) {
  console.log(
    `\n📱 Configuring Expo project for ${EDITIONS[edition].name} Edition...\n`
  );

  // Save the configuration file
  saveEditionConfig(projectRoot, edition);

  // Check if already in app.json/app.config.js
  const appJsonPath = path.join(projectRoot, 'app.json');
  const appConfigPath = path.join(projectRoot, 'app.config.js');

  let configured = false;

  if (fs.existsSync(appJsonPath)) {
    try {
      const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
      if (!appJson.expo) appJson.expo = {};
      if (!appJson.expo.plugins) appJson.expo.plugins = [];

      // Check if plugin already exists
      const hasPlugin = appJson.expo.plugins.some((p) =>
        Array.isArray(p) ? p[0] === 'cbl-reactnative' : p === 'cbl-reactnative'
      );

      if (!hasPlugin) {
        appJson.expo.plugins.push('cbl-reactnative');
        fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
        configured = true;
      }
    } catch (error) {
      console.error('Error updating app.json:', error.message);
    }
  }

  console.log('Configuration saved to cbl-edition.json');

  if (!configured) {
    console.log('\n📝 Add this to your app.json or app.config.js:');
    console.log('\n  "plugins": ["cbl-reactnative"]\n');
  }

  console.log('\n🔄 Next steps:');
  console.log('   1. Run: expo prebuild --clean');
  console.log('   2. Run: expo run:ios or expo run:android\n');

  if (edition === 'EE') {
    console.log('  Enterprise Edition Notes:');
    console.log('   - Ensure you have a valid Couchbase Enterprise license');
    console.log(
      '   - You may need to configure additional repository access\n'
    );
  }
}

function configureReactNativeProject(projectRoot, edition) {
  console.log(
    `\n📱 Configuring React Native project for ${EDITIONS[edition].name} Edition...\n`
  );

  // Save the configuration file
  saveEditionConfig(projectRoot, edition);

  const editionConfig = EDITIONS[edition];

  console.log('Configuration saved to cbl-edition.json');
  console.log('\n Manual configuration required:\n');

  console.log('ANDROID - Add to android/app/build.gradle:');
  console.log('```gradle');
  console.log('android {');
  console.log('  configurations.all {');
  console.log('    resolutionStrategy {');
  console.log(`      force "${editionConfig.android}:3.2.1"`);
  console.log('    }');
  console.log('  }');
  console.log('}');
  console.log('```\n');

  console.log('iOS - Add to ios/Podfile:');
  if (edition === 'EE') {
    console.log(
      "source 'https://github.com/couchbase/couchbase-lite-ios-ee.git'"
    );
  }
  console.log('```ruby');
  console.log('target "YourApp" do');
  console.log(
    `  pod '${editionConfig.ios}', '3.2.1', :modular_headers => true`
  );
  console.log('  # ... rest of your pods');
  console.log('end');
  console.log('```\n');

  console.log('Next steps:');
  console.log('   Android: cd android && ./gradlew clean && cd ..');
  console.log('   iOS: cd ios && pod install && cd ..\n');
}

function main() {
  const args = process.argv.slice(2);
  const edition = (args[0] || 'CE').toUpperCase();

  if (!EDITIONS[edition]) {
    console.error(` Invalid edition: ${edition}`);
    console.error('   Usage: npx cbl-reactnative-configure [CE|EE]');
    process.exit(1);
  }

  const projectRoot = findProjectRoot();
  const projectType = detectProjectType(projectRoot);

  console.log(`\n Couchbase Lite React Native Configuration`);
  console.log(`   Project type: ${projectType}`);
  console.log(`   Project root: ${projectRoot}`);
  console.log(`   Edition: ${EDITIONS[edition].name} (${edition})`);

  if (projectType === 'expo') {
    configureExpoProject(projectRoot, edition);
  } else {
    configureReactNativeProject(projectRoot, edition);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { EDITIONS, findProjectRoot, detectProjectType };

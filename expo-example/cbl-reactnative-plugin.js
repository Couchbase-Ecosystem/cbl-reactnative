const {
  withProjectBuildGradle,
  withXcodeProject,
  withPodfileProperties,
} = require('@expo/config-plugins');

// Function to modify Android build.gradle
function modifyAndroidBuildGradle(config) {
  const lineToAdd = ` apply from: "../../android/build.gradle"`;
  if (!config.modResults.contents.includes(lineToAdd)) {
    config.modResults.contents += lineToAdd;
  }
  return config;
}

// Function to modify iOS Xcode project
function modifyXcodeProject(config) {
  const xcodeProject = config.modResults;
  // Example modification: adding a build phase for a script
  // xcodeProject.addBuildPhase([], 'PBXShellScriptBuildPhase', 'Run Script', null, script);
  return config;
}

// Function to modify Podfile properties to include the native module podspec
function includeNativeModulePod(config) {
  return withPodfileProperties(config, async (podConfig) => {
    // Assuming the path to the podspec is relative to the iOS directory in the Expo app
    // Adjust the path as necessary based on your project structure
    const podspecPath = `../../cbl-reactnative.podspec`;
    podConfig.modResults.podfileProperties.pod(
      `'cbl-reactnative', :path => '${podspecPath}'`
    );
    return podConfig;
  });
}

module.exports = (config) => {
  config = withProjectBuildGradle(config, async (gradleConfig) => {
    return modifyAndroidBuildGradle(gradleConfig);
  });
  config = withXcodeProject(config, async (xcodeConfig) => {
    return modifyXcodeProject(xcodeConfig);
  });
  return config;
};

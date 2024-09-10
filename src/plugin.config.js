const {
  withProjectBuildGradle,
  withXcodeProject,
  withPodfile,
} = require('@expo/config-plugins');

// Function to modify Android build.gradle
function modifyAndroidBuildGradle(config) {
  const lineToAdd = ` apply from: "../../android/build.gradle"`;
  if (!config.modResults.contents.includes(lineToAdd)) {
    config.modResults.contents += `\n${lineToAdd}`;
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
  return withPodfile(config, (podfileConfig) => {
    const podspecPath = `../../cbl-reactnative.podspec`;
    if (!podfileConfig.modResults.contents.includes(podspecPath)) {
      podfileConfig.modResults.contents += `\npod 'cbl-reactnative', :path => '${podspecPath}'\n`;
    }
    return podfileConfig;
  });
}

module.exports = (config) => {
  config = withProjectBuildGradle(config, (gradleConfig) => {
    return modifyAndroidBuildGradle(gradleConfig);
  });
  config = withXcodeProject(config, (xcodeConfig) => {
    return modifyXcodeProject(xcodeConfig);
  });
  config = includeNativeModulePod(config);
  return config;
};

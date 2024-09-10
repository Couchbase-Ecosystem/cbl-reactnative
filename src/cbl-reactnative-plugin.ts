import {
  ConfigPlugin,
  Mod,
  ModConfig,
  withPodfileProperties,
  withProjectBuildGradle,
  withXcodeProject,
} from '@expo/config-plugins';

// Function to modify Android build.gradle
const modifyAndroidBuildGradle: Mod<ModConfig> = (config) => {
  const lineToAdd = ` apply from: "../../android/build.gradle"`;
  // @ts-ignore
  if (!config.modResults.contents.includes(lineToAdd)) {
    // @ts-ignore
    config.modResults.contents += lineToAdd;
  }
  return config;
};

// Function to modify iOS Xcode project
const modifyXcodeProject: Mod<ModConfig> = (config) => {
  const xcodeProject = config.modResults;
  // Example modification: adding a build phase for a script
  // xcodeProject.addBuildPhase([], 'PBXShellScriptBuildPhase', 'Run Script', null, script);
  return config;
};

// Function to modify Podfile properties to include the native module podspec
const includeNativeModulePod: ConfigPlugin = (config) => {
  return withPodfileProperties(config, async (podConfig) => {
    // Assuming the path to the podspec is relative to the iOS directory in the Expo app
    // Adjust the path as necessary based on your project structure
    const podspecPath = `../../cbl-reactnative.podspec`;
    // @ts-ignore
    podConfig.modResults.podfileProperties.pod(
      `'cbl-reactnative', :path => '${podspecPath}'`
    );
    return podConfig;
  });
};

const cblReactNative: ConfigPlugin = (config) => {
  // @ts-ignore
  config = withProjectBuildGradle(config, async (gradleConfig) => {
    // @ts-ignore
    return modifyAndroidBuildGradle(gradleConfig);
  });
  config = withXcodeProject(config, async (xcodeConfig) => {
    return modifyXcodeProject(xcodeConfig);
  });
  return config;
};
export default cblReactNative;

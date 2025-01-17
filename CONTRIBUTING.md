# Contributing

Whether you have a fix for a typo in a component, a bugfix, or a new feature, we'd love to collaborate.

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project. Before contributing, please read the [code of conduct](./CODE_OF_CONDUCT.md).

## Steps for Contributing

1. Sign the Contributor License Agreement:
   1. [Join the code review site](http://review.couchbase.org/).
   2. Log into the review site.
   3. [Fill out the agreement](http://review.couchbase.org/#/settings/agreements) under *Settings > Agreements*.

And while we welcome questions, we prefer to answer questions on our [developer forums](https://forums.couchbase.com/) rather than in Github issues.

## Development Requirements
- Javascript
  - [Node 20](https://formulae.brew.sh/formula/node@20)
    - LTS version is highly recommended
- React Native
  - [React Native - Getting Started](https://reactnative.dev/docs/environment-setup)
    - You should note that while the library is a React Native - Native Module, React recommends all apps use Expo or another framework.  The provided example app is an Expo based app, so you will need to have knowledge on React, React Native, and Expo
  - [Understanding on React Native - Native Module Development](https://reactnative.dev/docs/native-modules-intro)
  - [Expo Setup](https://docs.expo.dev/get-started/set-up-your-environment/?platform=ios&device=physical&mode=development-build&buildEnv=local)
    - The example app provided to test the Native Module is an expo based app, so you have to have your environment setup for expo
    - For expo setup on the link provided above, you must select `Development build` and turn off `Build with Expo Appplication Services (EAS)` for proper instructions
    - You should have a clear understanding of expo's [dev client environment](https://docs.expo.dev/guides/local-app-development/#local-builds-with-expo-dev-client).
- IDEs
  - [Visual Studio Code](https://code.visualstudio.com/download)
  - [IntelliJ IDEA](https://www.jetbrains.com/idea/download/)
- iOS Development
  - A modern Mac
  - [XCode 15](https://developer.apple.com/xcode/) or higher installed and working
  - [XCode Command Line Tools](https://developer.apple.com/download/more/) installed
  - [Simulators](https://developer.apple.com/documentation/safari-developer-tools/installing-xcode-and-simulators) downloaded and working
  - [Homebrew](https://brew.sh/)
  - [Cocopods](https://formulae.brew.sh/formula/cocoapods)

  - A valid Apple Developer account and certificates installed and working
- Android Development
  - [Android Studio](https://developer.android.com/studio?gad_source=1&gclid=CjwKCAjwzN-vBhAkEiwAYiO7oALYfxbMYW_zkuYoacS9TX16aItdvLYe6GB7_j1QwvXBjFDRkawfUBoComcQAvD_BwE&gclsrc=aw.ds) installed and working
  - Android SDK 34 >= installed and working (with command line tools)
  - Java SDK v17 installed and working with Android Studio
  - An Android Emulator downloaded and working

## Project Structure

The root directory of the repository contains the following files and directories:
- `android`:  This is the Native Module code for the Android platform.  It is written in Kotlin. The cbl-js-kotlin folder is a Git submodule and has shared code between this project and other projects like cbl-ionic.
- `expo-example`: This is the example application for testing changes to the Native Module.  It is an Expo based app, and you can look at the `package.json` file to see the various commands available.  Note:  When the Native Module version is updated, the example app version should match.
- `ios`: This is the Native Module code for the iOS platform.  It is written in Objective-C and Swift.  The `cbl-js-swift` folder is a Git submodule and has shared code between this project and other projects like cbl-ionic.
- `src`: This is the Native Module source code in Typescript for the project. The `cblite-js` folder is a Git submodule and defines the entire API surface of the cblite-js library.  This library is shared between all similar projects like cbl-ionic.  `CblReactNativeEngine` is an implementation of the `cblite-js` library that is defined in the `ICoreEngine` interface in `cblite-js`.  `CblReactNativeEngine` is the bridge between the Native Module and the `cblite-js` library.

## Development Workflow

It's recommended that new APIs be defined in Typescript first to flush out the requirements for sending the data over the bridge, and then implemented in the Native Module.  The Native Module should be tested in the example app to ensure that it works as expected.

Any breaking changes to the cblite-js library will require changes in other libraries like cbl-ionic, so it's important to remember that PRs that make changes to this library are less like to be approved without justification.

If you want to use Android Studio or XCode to edit the native code, you can open the `expo-example/android` or `expo-example/ios` directories respectively in those editors. To edit the Objective-C or Swift files, open `expo-example/ios/expoexample.xcworkspace` in XCode and find the source files at `Pods > Development Pods > cbl-reactnative`.

To edit the Java or Kotlin files, open `expo-example/android` in Android studio and find the source files at `cbl-reactnative` under `Android`.

**NOTE**:  Until you do an initial build both directories might not have the files required to build the project.

## How to Build the Project

Fork and clone this repo.  You will need to also clone all the submodules for the shared libraries and tests and update them with the latest version of each of those modules code.  **IF YOU DON'T PULL SUBMODULES IT WON'T BUILD**

```sh
git clone --recurse-submodules git@github.com:Couchbase-Ecosystem/cbl-reactnative.git
cd cbl-reactnative
git submodule update --remote --recursive
```

Install the required packages
```sh
npm install
```

To build the example app change to the expo-example folder:
```sh
cd .. expo-example
```

Android:
```sh
npm run android
```

iOS:

```sh
npm run ios
```
Expo cache can sometimes break things.  Note when you make changes to Native Code you MUST do a new build to see the changes reflected as watchman doesn't watch Native Code changes, only changes to the local application.  So ANY Native Module code changes to the iOS, Android, or typescript code will require a new build.

You can manually clear the cache by running:
```sh
npm run prebuild:clean
```

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module..
- `test`: adding or updating tests, e.g. add integration tests using detox.
- `chore`: tooling changes, e.g. change CI config.

Our pre-commit hooks verify that your commit message matches this format when committing.

### Linting and tests

[ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [TypeScript](https://www.typescriptlang.org/)

We use [TypeScript](https://www.typescriptlang.org/) for type checking, [ESLint](https://eslint.org/) with [Prettier](https://prettier.io/) for linting and formatting the code, and [Jest](https://jestjs.io/) for testing.

Our pre-commit hooks verify that the linter and tests pass when committing.

### Publishing to npm

We use [release-it](https://github.com/release-it/release-it) to make it easier to publish new versions. It handles common tasks like bumping version based on semver, creating tags and releases etc.

To publish new versions, run the following:

```sh
npm release
```

### Scripts

#### Native Module
The root directory `package.json` file contains various scripts for common tasks:

- `npm`: setup project by installing dependencies.
- `npm typecheck`: type-check files with TypeScript.
- `npm lint`: lint files with ESLint.
- `npm clean`: clean the lib folder and the example app native ios and android build folders.
- `npm build`: run a build using the React Native builder (bob)
-
#### Expo example app
The `expo-example` directory `package.json` file contains various scripts for common tasks:

- `prebuild`: setup project by installing dependencies along with the native dependencies.
- `prebuild:clean`: cleans out all directories and cache first, then runs a prebuild
- `start`: starts the expo server and provides the menu for running the app on various devices.
- `android`: starts the expo server and runs the app on an android emulator or device.
- `ios`: starts the expo server and runs the app on an iOS simulator or device.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://app.egghead.io/playlists/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.

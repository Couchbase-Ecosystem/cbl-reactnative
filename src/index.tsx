import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'cbl-reactnative' doesn't seem to be linked. Make sure: \n\n` +
  Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
  '- You rebuilt the app after installing the package\n' +
  '- You are not using Expo Go\n';

const CblReactnative = NativeModules.CblReactnative
  ? NativeModules.CblReactnative
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export function multiply(a: number, b: number): Promise<number> {
  return CblReactnative.multiply(a, b);
}

import { NativeModules, Platform } from 'react-native';

export class CblReactNativeEngine {
  private static readonly LINKING_ERROR =
    `The package 'cbl-reactnative' doesn't seem to be linked. Make sure: \n\n` +
    Platform.select({ ios: "- You have run 'pod install'\n", default: '' }) +
    '- You rebuilt the app after installing the package\n' +
    '- You are not using Expo Go\n';

  CblReactnative = NativeModules.CblReactnative
    ? NativeModules.CblReactnative
    : new Proxy(
        {},
        {
          get() {
            throw new Error(CblReactNativeEngine.LINKING_ERROR);
          },
        }
      );

  multiply(a: number, b: number): Promise<number> {
    return this.CblReactnative.multiply(a, b);
  }

  file_GetDefaultPath(): Promise<{ path: string }> {
    return new Promise((resolve, reject) => {
      this.CblReactnative.file_GetDefaultPath().then(
        (result: string) => {
          resolve({ path: result });
        },
        (error: any) => {
          reject(error);
        }
      );
    });
  }
}

import { LogSinks } from 'cbl-reactnative';

export default async function disableCustomSink() {
  try {
    await LogSinks.setCustom(null);
    return '✅ Custom LogSink disabled';
  } catch (error: any) {
    return `❌ Error disabling custom LogSink: ${error.message}`;
  }
}


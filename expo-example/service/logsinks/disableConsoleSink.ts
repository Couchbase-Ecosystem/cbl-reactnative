import { LogSinks } from 'cbl-reactnative';

export default async function disableConsoleSink() {
  try {
    await LogSinks.setConsole(null);
    return '✅ Console LogSink disabled';
  } catch (error: any) {
    return `❌ Error disabling console LogSink: ${error.message}`;
  }
}


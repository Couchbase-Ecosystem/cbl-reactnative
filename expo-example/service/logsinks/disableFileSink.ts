import { LogSinks } from 'cbl-reactnative';

export default async function disableFileSink() {
  try {
    await LogSinks.setFile(null);
    return '✅ File LogSink disabled';
  } catch (error: any) {
    return `❌ Error disabling file LogSink: ${error.message}`;
  }
}


import React, { useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStyleScheme, Text } from '@/components/Themed/Themed';
import { View } from 'react-native';
import { Button, ButtonText, Divider } from '@gluestack-ui/themed';
import { 
  Database, 
  DatabaseConfiguration,
  Collection,
  MutableDocument,
  LogSinks,
  LogLevel,
  LogDomain
} from 'cbl-reactnative';
import getFileDefaultPath from '@/service/file/getFileDefaultPath';
import useNavigationBarTitleResetOption from '@/hooks/useNavigationBarTitleResetOption';
import ResultListView from '@/components/ResultsListView/ResultsListView';

export default function FileLoggingTestScreen() {
  const [listOfLogs, setListOfLogs] = useState<string[]>([]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  const [database, setDatabase] = useState<Database | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [logDirectory, setLogDirectory] = useState<string>('');
  const [currentLogLevel, setCurrentLogLevel] = useState<string>('NONE');
  
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('File Logging Test', navigation, reset);

  function reset() {
    setListOfLogs([]);
    setErrorLogs([]);
    setDatabase(null);
    setCollection(null);
    setLogDirectory('');
    setCurrentLogLevel('NONE');
  }

  // File Logging Setup Functions
  const enableFileLogging = async (level: LogLevel, usePlaintext: boolean = false) => {
    try {
      const defaultPath = await getFileDefaultPath();
      const logsDir = `${defaultPath}/test_logs`;
      setLogDirectory(logsDir);
      
      await LogSinks.setFile({
        level: level,
        directory: logsDir,
        usePlaintext: usePlaintext,
        maxFileSize: 1024 * 1024, // 1 MB
        maxKeptFiles: 3,
      });
      
      const levelName = LogLevel[level];
      const format = usePlaintext ? 'PLAINTEXT' : 'BINARY';
      
      setCurrentLogLevel(levelName);
      setListOfLogs(prev => [...prev, `✅ File logging enabled: Level=${levelName}, Format=${format}`]);
      setListOfLogs(prev => [...prev, `📁 Log directory: ${logsDir}`]);
      setListOfLogs(prev => [...prev, `⚠️ Check file system for log files!`]);
    } catch (error: any) {
      setErrorLogs(prev => [...prev, `Error enabling file logging: ${error.message}`]);
    }
  };

  const disableFileLogging = async () => {
    try {
      await LogSinks.setFile(null);
      setCurrentLogLevel('NONE');
      setListOfLogs(prev => [...prev, `🚫 File logging disabled`]);
    } catch (error: any) {
      setErrorLogs(prev => [...prev, `Error disabling file logging: ${error.message}`]);
    }
  };

  // Database Operations to Trigger Logs
  const openDatabase = async () => {
    try {
      setListOfLogs(prev => [...prev, '📂 Opening Database (should write DATABASE logs to file)...']);
      const databaseName = 'file_logging_test_db';
      const dbConfig = new DatabaseConfiguration();
      const database = new Database(databaseName, dbConfig);
      await database.open();
      setListOfLogs(prev => [...prev, `✅ Database opened: ${database.getName()}`]);
      setDatabase(database);
    } catch (error: any) {
      setErrorLogs(prev => [...prev, `Error opening database: ${error.message}`]);
    }
  };

  const closeDatabase = async () => {
    try {
      if (!database) {
        setErrorLogs(prev => [...prev, 'No database to close']);
        return;
      }
      setListOfLogs(prev => [...prev, '🔒 Closing Database (should write logs to file)...']);
      await database.close();
      setListOfLogs(prev => [...prev, `✅ Database closed`]);
      setDatabase(null);
      setCollection(null);
    } catch (error: any) {
      setErrorLogs(prev => [...prev, `Error closing database: ${error.message}`]);
    }
  };

  const createCollection = async () => {
    try {
      if (!database) {
        setErrorLogs(prev => [...prev, 'Database not opened']);
        return;
      }
      setListOfLogs(prev => [...prev, '📁 Creating Collection (should write logs to file)...']);
      const collection = await database.createCollection('file_test_collection');
      if (collection) {
        setCollection(collection);
        setListOfLogs(prev => [...prev, `✅ Collection created`]);
      }
    } catch (error: any) {
      setErrorLogs(prev => [...prev, `Error creating collection: ${error.message}`]);
    }
  };

  const createDocuments = async () => {
    try {
      if (!collection) {
        setErrorLogs(prev => [...prev, 'Collection not created']);
        return;
      }
      setListOfLogs(prev => [...prev, '📄 Creating 5 Documents (should write logs to file)...']);
      
      for (let i = 0; i < 5; i++) {
        const doc = new MutableDocument();
        doc.setString('type', 'test');
        doc.setString('name', `File Test Document ${i + 1}`);
        doc.setNumber('value', Math.floor(Math.random() * 100));
        doc.setDate('createdAt', new Date());
        await collection.save(doc);
      }
      
      setListOfLogs(prev => [...prev, `✅ Created 5 documents`]);
    } catch (error: any) {
      setErrorLogs(prev => [...prev, `Error creating documents: ${error.message}`]);
    }
  };

  const runQuery = async () => {
    try {
      if (!database) {
        setErrorLogs(prev => [...prev, 'Database not opened']);
        return;
      }
      setListOfLogs(prev => [...prev, '🔍 Running Query (should write QUERY logs to file)...']);
      
      const queryString = `SELECT * FROM _default.file_test_collection WHERE type = 'test'`;
      const query = database.createQuery(queryString);
      const results = await query.execute();
      
      setListOfLogs(prev => [...prev, `✅ Query executed: Found ${results.length} document(s)`]);
    } catch (error: any) {
      setErrorLogs(prev => [...prev, `Error running query: ${error.message}`]);
    }
  };

  return (
    <SafeAreaView style={localStyles.container}>
      <ScrollView style={localStyles.scrollView}>
        <View style={localStyles.content}>
          <Text style={localStyles.title}>File Logging Test</Text>
          
          <View style={localStyles.warningBox}>
            <Text style={localStyles.warningText}>
              ⚠️ Check file system for log files!
            </Text>
            <Text style={localStyles.statusText}>
              Current Level: {currentLogLevel} | Directory: {logDirectory || 'Not set'}
            </Text>
          </View>

          <Text style={localStyles.sectionTitle}>1. Configure File Logging</Text>
          
          <View style={localStyles.buttonGroup}>
            <Text style={localStyles.groupLabel}>Log Levels (Binary Format):</Text>
            <View style={localStyles.buttonRow}>
              <Button 
                size="sm"
                style={{ flex: 1 }}
                onPress={() => enableFileLogging(LogLevel.DEBUG, false)}
              >
                <ButtonText>DEBUG</ButtonText>
              </Button>
              <View style={localStyles.buttonSpacer} />
              <Button 
                size="sm"
                style={{ flex: 1 }}
                onPress={() => enableFileLogging(LogLevel.VERBOSE, false)}
              >
                <ButtonText>VERBOSE</ButtonText>
              </Button>
            </View>
            <Button 
              size="sm"
              onPress={() => enableFileLogging(LogLevel.INFO, false)}
            >
              <ButtonText>INFO</ButtonText>
            </Button>
          </View>

          <View style={localStyles.buttonGroup}>
            <Text style={localStyles.groupLabel}>Plaintext Format:</Text>
            <Button 
              size="sm"
              variant="outline"
              onPress={() => enableFileLogging(LogLevel.VERBOSE, true)}
            >
              <ButtonText>Enable VERBOSE Plaintext Logging</ButtonText>
            </Button>
          </View>

          <Button 
            size="sm"
            action="negative"
            onPress={() => disableFileLogging()}
          >
            <ButtonText>🚫 Disable File Logging</ButtonText>
          </Button>

          <View style={localStyles.separator} />

          <Text style={localStyles.sectionTitle}>2. Trigger Log Events</Text>
          
          <View style={localStyles.buttonGroup}>
            <Text style={localStyles.groupLabel}>Database Operations:</Text>
            <View style={localStyles.buttonRow}>
              <Button size="sm" style={{ flex: 1 }} onPress={() => openDatabase()}>
                <ButtonText>Open DB</ButtonText>
              </Button>
              <View style={localStyles.buttonSpacer} />
              <Button size="sm" style={{ flex: 1 }} onPress={() => closeDatabase()}>
                <ButtonText>Close DB</ButtonText>
              </Button>
            </View>
            <Button size="sm" onPress={() => createCollection()}>
              <ButtonText>Create Collection</ButtonText>
            </Button>
          </View>

          <View style={localStyles.buttonGroup}>
            <Text style={localStyles.groupLabel}>Document & Query Operations:</Text>
            <Button size="sm" onPress={() => createDocuments()}>
              <ButtonText>Create 5 Documents</ButtonText>
            </Button>
            <Button size="sm" onPress={() => runQuery()}>
              <ButtonText>Run Query</ButtonText>
            </Button>
          </View>

          <View style={localStyles.separator} />

          <Button 
            size="sm"
            action="secondary"
            onPress={() => {setListOfLogs([]); setErrorLogs([])}}
          >
            <ButtonText>CLEAR LOGS</ButtonText>
          </Button>

          <View style={localStyles.separator} />

          <Text style={localStyles.sectionTitle}>Activity Logs</Text>

          <View style={localStyles.logContainer}>
            {listOfLogs.length === 0 ? (
              <Text style={localStyles.emptyLog}>No activity yet. Start by enabling file logging above.</Text>
            ) : (
              listOfLogs.map((log, index) => (
                <Text key={index} style={localStyles.logText}>
                  {log}
                </Text>
              ))
            )}
          </View>

          {errorLogs.length > 0 && (
            <>
              <Text style={localStyles.errorTitle}>Errors</Text>
              <View style={localStyles.errorContainer}>
                {errorLogs.map((log, index) => (
                  <Text key={index} style={localStyles.errorText}>
                    {log}
                  </Text>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ffc107',
  },
  warningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 11,
    color: '#856404',
    fontStyle: 'italic',
  },
  buttonGroup: {
    marginBottom: 15,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  buttonRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  buttonSpacer: {
    width: 10,
  },
  separator: {
    height: 20,
  },
  logContainer: {
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 5,
    minHeight: 100,
    marginBottom: 15,
  },
  logText: {
    fontSize: 12,
    marginBottom: 5,
    lineHeight: 18,
  },
  emptyLog: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#999',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    color: 'red',
  },
  errorContainer: {
    padding: 10,
    backgroundColor: '#ffe6e6',
    borderRadius: 5,
    marginBottom: 15,
  },
  errorText: {
    color: 'red',
    fontSize: 12,
    marginBottom: 5,
  },
});
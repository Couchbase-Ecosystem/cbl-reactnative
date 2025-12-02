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

export default function CustomLoggingTestScreen() {
  const [listOfLogs, setListOfLogs] = useState<string[]>([]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);
  const [capturedLogs, setCapturedLogs] = useState<string[]>([]);
  const [database, setDatabase] = useState<Database | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [currentLogLevel, setCurrentLogLevel] = useState<string>('NONE');
  const [currentDomains, setCurrentDomains] = useState<string>('NONE');
  
  const navigation = useNavigation();
  const styles = useStyleScheme();
  useNavigationBarTitleResetOption('Custom Logging Test', navigation, reset);

  function reset() {
    setListOfLogs([]);
    setErrorLogs([]);
    setCapturedLogs([]);
    setDatabase(null);
    setCollection(null);
    setIsListening(false);
    setCurrentLogLevel('NONE');
    setCurrentDomains('NONE');
  }

  // Custom Logging Setup Functions
  const enableCustomLogging = async (level: LogLevel, domains: LogDomain[]) => {
    try {
      await LogSinks.setCustom({
        level: level,
        domains: domains,
        callback: (logLevel, logDomain, message) => {
          const timestamp = new Date().toLocaleTimeString();
          const logEntry = `[${timestamp}] [${logDomain}] ${message}`;
          setCapturedLogs(prev => [...prev, logEntry]);
        },
      });
      
      const levelName = LogLevel[level];
      const domainNames = domains.map(d => d.toString()).join(', ');
      
      setCurrentLogLevel(levelName);
      setCurrentDomains(domainNames);
      setIsListening(true);
      setListOfLogs(prev => [...prev, `✅ Custom logging enabled: Level=${levelName}, Domains=[${domainNames}]`]);
      setListOfLogs(prev => [...prev, `👂 Listening for logs... logs will appear below`]);
    } catch (error: any) {
      setErrorLogs(prev => [...prev, `Error enabling custom logging: ${error.message}`]);
    }
  };

  const disableCustomLogging = async () => {
    try {
      await LogSinks.setCustom(null);
      setCurrentLogLevel('NONE');
      setCurrentDomains('NONE');
      setIsListening(false);
      setListOfLogs(prev => [...prev, `🚫 Custom logging disabled`]);
    } catch (error: any) {
      setErrorLogs(prev => [...prev, `Error disabling custom logging: ${error.message}`]);
    }
  };

  // Database Operations to Trigger Logs
  const openDatabase = async () => {
    try {
      setListOfLogs(prev => [...prev, '📂 Opening Database (should trigger callback)...']);
      const databaseName = 'custom_logging_test_db';
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
      setListOfLogs(prev => [...prev, '🔒 Closing Database...']);
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
      setListOfLogs(prev => [...prev, '📁 Creating Collection...']);
      const collection = await database.createCollection('custom_test_collection');
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
      setListOfLogs(prev => [...prev, '📄 Creating 5 Documents...']);
      
      for (let i = 0; i < 5; i++) {
        const doc = new MutableDocument();
        doc.setString('type', 'test');
        doc.setString('name', `Custom Test Document ${i + 1}`);
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
      setListOfLogs(prev => [...prev, '🔍 Running Query...']);
      
      const queryString = `SELECT * FROM _default.custom_test_collection WHERE type = 'test'`;
      const query = database.createQuery(queryString);
      const results = await query.execute();
      
      setListOfLogs(prev => [...prev, `✅ Query executed: Found ${results.length} document(s)`]);
    } catch (error: any) {
      setErrorLogs(prev => [...prev, `Error running query: ${error.message}`]);
    }
  };

  const clearCapturedLogs = () => {
    setCapturedLogs([]);
    setListOfLogs(prev => [...prev, '🧹 Cleared captured logs']);
  };

  return (
    <SafeAreaView style={localStyles.container}>
      <ScrollView style={localStyles.scrollView}>
        <View style={localStyles.content}>
          <Text style={localStyles.title}>Custom Logging Test</Text>
          
          <View style={localStyles.warningBox}>
            <Text style={localStyles.warningText}>
              👂 Logs will appear in "Captured Logs" section below!
            </Text>
            <Text style={localStyles.statusText}>
              Current Level: {currentLogLevel} | Domains: {currentDomains}
            </Text>
            {isListening && (
              <Text style={localStyles.listeningText}>
                ✅ Listening... ({capturedLogs.length} logs received)
              </Text>
            )}
          </View>

          <Text style={localStyles.sectionTitle}>1. Configure Custom Logging</Text>
          
          <View style={localStyles.buttonGroup}>
            <Text style={localStyles.groupLabel}>Enable with ALL Domains:</Text>
            <View style={localStyles.buttonRow}>
              <Button 
                size="sm"
                style={{ flex: 1 }}
                onPress={() => enableCustomLogging(LogLevel.DEBUG, [LogDomain.ALL])}
              >
                <ButtonText>DEBUG ALL</ButtonText>
              </Button>
              <View style={localStyles.buttonSpacer} />
              <Button 
                size="sm"
                style={{ flex: 1 }}
                onPress={() => enableCustomLogging(LogLevel.VERBOSE, [LogDomain.ALL])}
              >
                <ButtonText>VERBOSE ALL</ButtonText>
              </Button>
            </View>
          </View>

          <View style={localStyles.buttonGroup}>
            <Text style={localStyles.groupLabel}>Enable with Specific Domains:</Text>
            <Button 
              size="sm"
              variant="outline"
              onPress={() => enableCustomLogging(LogLevel.VERBOSE, [LogDomain.DATABASE])}
            >
              <ButtonText>VERBOSE - DATABASE Only</ButtonText>
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onPress={() => enableCustomLogging(LogLevel.VERBOSE, [LogDomain.QUERY])}
            >
              <ButtonText>VERBOSE - QUERY Only</ButtonText>
            </Button>
            <Button 
              size="sm"
              variant="outline"
              onPress={() => enableCustomLogging(LogLevel.DEBUG, [LogDomain.DATABASE, LogDomain.QUERY])}
            >
              <ButtonText>DEBUG - DATABASE + QUERY</ButtonText>
            </Button>
          </View>

          <View style={localStyles.buttonRow}>
            <Button 
              size="sm"
              action="negative"
              style={{ flex: 1 }}
              onPress={() => disableCustomLogging()}
            >
              <ButtonText>🚫 Disable</ButtonText>
            </Button>
            <View style={localStyles.buttonSpacer} />
            <Button 
              size="sm"
              action="secondary"
              style={{ flex: 1 }}
              onPress={() => clearCapturedLogs()}
            >
              <ButtonText>🧹 Clear Logs</ButtonText>
            </Button>
          </View>

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
            <ButtonText>CLEAR ACTIVITY LOGS</ButtonText>
          </Button>

          <View style={localStyles.separator} />

          <Text style={localStyles.sectionTitle}>Activity Logs</Text>

          <View style={localStyles.logContainer}>
            {listOfLogs.length === 0 ? (
              <Text style={localStyles.emptyLog}>No activity yet. Enable custom logging and trigger operations above.</Text>
            ) : (
              listOfLogs.map((log, index) => (
                <Text key={index} style={localStyles.logText}>
                  {log}
                </Text>
              ))
            )}
          </View>

          {capturedLogs.length > 0 && (
            <>
              <Text style={localStyles.capturedTitle}>
                🎯 Captured Logs ({capturedLogs.length})
              </Text>
              <View style={localStyles.capturedContainer}>
                {capturedLogs.map((log, index) => (
                  <Text key={index} style={localStyles.capturedText}>
                    {log}
                  </Text>
                ))}
              </View>
            </>
          )}

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
    backgroundColor: '#e8f5e9',
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4caf50',
  },
  warningText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2e7d32',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 11,
    color: '#2e7d32',
    fontStyle: 'italic',
    marginBottom: 3,
  },
  listeningText: {
    fontSize: 13,
    color: '#2e7d32',
    fontWeight: 'bold',
    marginTop: 5,
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
  capturedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
    color: '#4caf50',
  },
  capturedContainer: {
    padding: 10,
    backgroundColor: '#e8f5e9',
    borderRadius: 5,
    marginBottom: 15,
    maxHeight: 300,
  },
  capturedText: {
    fontSize: 11,
    marginBottom: 3,
    color: '#2e7d32',
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
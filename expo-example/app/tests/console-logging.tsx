import React, { useState } from 'react';
import { SafeAreaView, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { View } from '@/components/Themed/Themed';
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

export default function ConsoleLoggingTestScreen() {
  const [listOfLogs, setListOfLogs] = useState<string[]>([]);
  const [errorLogs, setErrorLogs] = useState<string[]>([]);

  const [database, setDatabase] = useState<Database | null>(null);
  const [collection, setCollection] = useState<Collection | null>(null);
  const [listOfDocuments, setListOfDocuments] = useState<string[]>([]);
  const [currentLogLevel, setCurrentLogLevel] = useState<string>('NONE');
  const [currentDomains, setCurrentDomains] = useState<string>('NONE');

  // Console Logging Setup Functions
  const enableConsoleLogging = async (level: LogLevel, domains: LogDomain[]) => {
    try {
      await LogSinks.setConsole({
        level: level,
        domains: domains
      });
      
      const levelName = LogLevel[level];
      const domainNames = domains.map(d => d.toString()).join(', ');
      
      setCurrentLogLevel(levelName);
      setCurrentDomains(domainNames);
      setListOfLogs(prev => [...prev, `✅ Console logging enabled: Level=${levelName}, Domains=[${domainNames}]`]);
      setListOfLogs(prev => [...prev, `⚠️ Check your terminal/console for Couchbase Lite logs!`]);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error enabling console logging: ${error.message}`]);
    }
  }

  const disableConsoleLogging = async () => {
    try {
      await LogSinks.setConsole(null);
      setCurrentLogLevel('NONE');
      setCurrentDomains('NONE');
      setListOfLogs(prev => [...prev, `🚫 Console logging disabled`]);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error disabling console logging: ${error.message}`]);
    }
  }

  // Database Operations to Trigger Logs
  const openDatabase = async () => {
    try {
      setListOfLogs(prev => [...prev, '📂 Opening Database (should trigger DATABASE logs)...']);
      const databaseName = 'console_logging_test_db';
      const directory = await getFileDefaultPath();
      const dbConfig = new DatabaseConfiguration();
      const database = new Database(databaseName, dbConfig);
      await database.open();
      setListOfLogs(prev => [...prev, `✅ Database opened: ${database.getName()}`]);
      setDatabase(database);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error opening database: ${error.message}`]);
    }
  }

  const closeDatabase = async () => {
    try {
      if (!database) {
        setErrorLogs(prev => [...prev, 'No database to close']);
        return;
      }
      setListOfLogs(prev => [...prev, '🔒 Closing Database (should trigger DATABASE logs)...']);
      await database.close();
      setListOfLogs(prev => [...prev, `✅ Database closed`]);
      setDatabase(null);
      setCollection(null);
      setListOfDocuments([]);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error closing database: ${error.message}`]);
    }
  }

  const createCollection = async () => {
    try {
      if (!database) {
        setErrorLogs(prev => [...prev, 'Database not opened']);
        return;
      }
      setListOfLogs(prev => [...prev, '📁 Creating Collection (should trigger DATABASE logs)...']);
      const collection = await database.createCollection('console_test_collection');
      if (collection) {
        setCollection(collection);
        setListOfLogs(prev => [...prev, `✅ Collection created`]);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error creating collection: ${error.message}`]);
    }
  }

  const createDocument = async () => {
    try {
      if (!collection) {
        setErrorLogs(prev => [...prev, 'Collection not created']);
        return;
      }
      setListOfLogs(prev => [...prev, '📄 Creating Document (should trigger DATABASE logs)...']);
      
      const doc = new MutableDocument();
      doc.setString('type', 'test');
      doc.setString('name', 'Console Test Document');
      doc.setNumber('value', Math.floor(Math.random() * 100));
      doc.setDate('createdAt', new Date());

      await collection.save(doc);
      setListOfLogs(prev => [...prev, `✅ Document created: ${doc.getId()}`]);
      setListOfDocuments(prev => [...prev, doc.getId()]);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error creating document: ${error.message}`]);
    }
  }

  const updateDocument = async () => {
    try {
      if (!collection || listOfDocuments.length === 0) {
        setErrorLogs(prev => [...prev, 'No documents to update']);
        return;
      }

      const docId = listOfDocuments[listOfDocuments.length - 1];
      setListOfLogs(prev => [...prev, `✏️ Updating Document (should trigger DATABASE logs)...`]);
      
      const doc = await collection.document(docId);
      if (doc) {
        const mutableDoc = new MutableDocument(doc.getId(), doc.toDictionary());
        mutableDoc.setNumber('value', Math.floor(Math.random() * 100));
        mutableDoc.setDate('updatedAt', new Date());
        
        await collection.save(mutableDoc);
        setListOfLogs(prev => [...prev, `✅ Document updated: ${docId}`]);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error updating document: ${error.message}`]);
    }
  }

  const deleteDocument = async () => {
    try {
      if (!collection || listOfDocuments.length === 0) {
        setErrorLogs(prev => [...prev, 'No documents to delete']);
        return;
      }

      const docId = listOfDocuments[listOfDocuments.length - 1];
      setListOfLogs(prev => [...prev, `🗑️ Deleting Document (should trigger DATABASE logs)...`]);
      
      const doc = await collection.document(docId);
      if (doc) {
        await collection.deleteDocument(doc);
        setListOfDocuments(prev => prev.filter(id => id !== docId));
        setListOfLogs(prev => [...prev, `✅ Document deleted: ${docId}`]);
      }
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error deleting document: ${error.message}`]);
    }
  }

  const runQuery = async () => {
    try {
      if (!database) {
        setErrorLogs(prev => [...prev, 'Database not opened']);
        return;
      }
      setListOfLogs(prev => [...prev, '🔍 Running Query (should trigger QUERY logs)...']);
      
      const queryString = `SELECT * FROM _default.console_test_collection WHERE type = 'test'`;
      const query = database.createQuery(queryString);
      const results = await query.execute();
      
      setListOfLogs(prev => [...prev, `✅ Query executed: Found ${results.length} document(s)`]);
    } catch (error) {
      // @ts-ignore
      setErrorLogs(prev => [...prev, `Error running query: ${error.message}`]);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Console Logging Test</Text>
          
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ Check your terminal/console for Couchbase Lite logs!
            </Text>
            <Text style={styles.statusText}>
              Current Level: {currentLogLevel} | Domains: {currentDomains}
            </Text>
          </View>

          <Text style={styles.sectionTitle}>1. Configure Console Logging</Text>
          
          <View style={styles.buttonGroup}>
            <Text style={styles.groupLabel}>Log Levels:</Text>
            <View style={styles.buttonRow}>
              <Button 
                title="DEBUG" 
                onPress={() => enableConsoleLogging(LogLevel.DEBUG, [LogDomain.ALL])} 
              />
              <View style={styles.buttonSpacer} />
              <Button 
                title="VERBOSE" 
                onPress={() => enableConsoleLogging(LogLevel.VERBOSE, [LogDomain.ALL])} 
              />
            </View>
            <View style={styles.buttonRow}>
              <Button 
                title="INFO" 
                onPress={() => enableConsoleLogging(LogLevel.INFO, [LogDomain.ALL])} 
              />
              <View style={styles.buttonSpacer} />
              <Button 
                title="WARNING" 
                onPress={() => enableConsoleLogging(LogLevel.WARNING, [LogDomain.ALL])} 
              />
            </View>
            <Button 
              title="ERROR" 
              onPress={() => enableConsoleLogging(LogLevel.ERROR, [LogDomain.ALL])} 
            />
          </View>

          <View style={styles.buttonGroup}>
            <Text style={styles.groupLabel}>Domain Filters:</Text>
            <Button 
              title="DATABASE Only" 
              onPress={() => enableConsoleLogging(LogLevel.VERBOSE, [LogDomain.DATABASE])} 
            />
            <Button 
              title="QUERY Only" 
              onPress={() => enableConsoleLogging(LogLevel.VERBOSE, [LogDomain.QUERY])} 
            />
            <Button 
              title="DATABASE + QUERY" 
              onPress={() => enableConsoleLogging(LogLevel.VERBOSE, [LogDomain.DATABASE, LogDomain.QUERY])} 
            />
            <Button 
              title="ALL Domains" 
              onPress={() => enableConsoleLogging(LogLevel.VERBOSE, [LogDomain.ALL])} 
            />
          </View>

          <Button 
            title="🚫 Disable Console Logging" 
            color="orange" 
            onPress={() => disableConsoleLogging()} 
          />

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>2. Trigger Log Events</Text>
          
          <View style={styles.buttonGroup}>
            <Text style={styles.groupLabel}>Database Operations:</Text>
            <View style={styles.buttonRow}>
              <Button title="Open Database" onPress={() => openDatabase()} />
              <View style={styles.buttonSpacer} />
              <Button title="Close Database" onPress={() => closeDatabase()} />
            </View>
            <Button title="Create Collection" onPress={() => createCollection()} />
          </View>

          <View style={styles.buttonGroup}>
            <Text style={styles.groupLabel}>Document Operations:</Text>
            <Button title="Create Document" onPress={() => createDocument()} />
            <View style={styles.buttonRow}>
              <Button title="Update Doc" onPress={() => updateDocument()} />
              <View style={styles.buttonSpacer} />
              <Button title="Delete Doc" onPress={() => deleteDocument()} />
            </View>
          </View>

          <View style={styles.buttonGroup}>
            <Text style={styles.groupLabel}>Query Operations:</Text>
            <Button title="Run Query" onPress={() => runQuery()} />
          </View>

          <View style={styles.separator} />

          <Button 
            title="CLEAR LOGS" 
            color="red" 
            onPress={() => {setListOfLogs([]); setErrorLogs([])}} 
          />

          <View style={styles.separator} />

          <Text style={styles.sectionTitle}>
            Documents Created: {listOfDocuments.length}
          </Text>

          {listOfDocuments.length > 0 && (
            <View style={styles.documentList}>
              {listOfDocuments.map((docId, index) => (
                <Text key={index} style={styles.documentItem}>
                  • {docId}
                </Text>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Activity Logs</Text>

          <View style={styles.logContainer}>
            {listOfLogs.length === 0 ? (
              <Text style={styles.emptyLog}>No activity yet. Start by configuring console logging above.</Text>
            ) : (
              listOfLogs.map((log, index) => (
                <Text key={index} style={styles.logText}>
                  {log}
                </Text>
              ))
            )}
          </View>

          {errorLogs.length > 0 && (
            <>
              <Text style={styles.errorTitle}>Errors</Text>
              <View style={styles.errorContainer}>
                {errorLogs.map((log, index) => (
                  <Text key={index} style={styles.errorText}>
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

const styles = StyleSheet.create({
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
    fontSize: 12,
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
  documentList: {
    marginBottom: 15,
  },
  documentItem: {
    fontSize: 12,
    marginBottom: 3,
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


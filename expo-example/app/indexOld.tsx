import { StyleSheet, Button } from 'react-native';
import { useState } from 'react';
import { Text, View } from '@/components/Themed';
import getFileDefaultPath from '@/service/file/getFileDefaultPath';

export default function TabOneScreen() {
  const [result, setResult] = useState<string | undefined>();

  // This function is called when the button is pressed
  const handlePress = async () => {
    try {
      const path = await getFileDefaultPath();
      setResult(path);
    } catch (error) {
      // @ts-ignore
      setResult(error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text>Result: {result}</Text>
      <Button title="Get Default Path" onPress={handlePress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
});

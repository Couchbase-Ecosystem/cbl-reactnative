import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DocumentEditorActionFormProps } from '@/components/DocumentEditorActionForm/documentEditorActionFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput/StyledTextInput';
import { useStyleScheme } from '@/components/Themed/Themed';
import HeaderView from '@/components/HeaderView/HeaderView';
import { useWidgetSelectOptions } from '@/hooks/useWidgetSelectOptions';
import SelectKeyValue from '@/components/SelectKeyValue/SelectKeyValue';
import { useGeneratedWidgets } from '@/hooks/useGeneratedWidgets';
import { Divider } from '@gluestack-ui/themed';
export default function DocumentEditorActionForm({
  documentId,
  setDocumentId,
  document,
  setDocument,
  style,
}: DocumentEditorActionFormProps) {
  const [selectKey, setSelectKey] = useState(0);

  const styles = useStyleScheme();
  const widgetOptions = useWidgetSelectOptions();
  const widgets = useGeneratedWidgets();

  function updateSelectedWidget(value: string) {
    const key = parseInt(value, 10);
    setSelectKey(key);
    const selectedWidget = widgets[key];
    if (selectedWidget) {
      const json = JSON.stringify(selectedWidget.doc);
      setDocument(json);
      setDocumentId(selectedWidget.doc.id);
    }
  }

  return (
    <>
      <HeaderView
        name="Document Information"
        iconName="file-document"
        style={style}
      />
      <View style={styles.component}>
        <StyledTextInput
          style={styles.input}
          autoCapitalize="none"
          placeholder="Document Id"
          onChangeText={(documentIdText) => setDocumentId(documentIdText)}
          defaultValue={documentId}
        />
        <Divider style={localStyles.divider} />
        <StyledTextInput
          autoCapitalize="none"
          style={[styles.textInput, localStyles.inputJsonDocument]}
          placeholder="JSON Document"
          onChangeText={(newText) => setDocument(newText)}
          defaultValue={document}
          multiline={true}
        />
      </View>
      <HeaderView name="Generated Data" iconName="file-document-multiple" />
      <View style={styles.component}>
        <SelectKeyValue
          headerTitle="Select Document"
          onSelectChange={updateSelectedWidget}
          placeholder="Select a Generated Widget"
          items={widgetOptions}
        />
      </View>
    </>
  );
}

const localStyles = StyleSheet.create({
  divider: {
    marginTop: 5,
    marginBottom: 10,
  },
  inputJsonDocument: {
    height: undefined,
    minHeight: 120,
    marginTop: 2,
    marginBottom: 15,
  },
});

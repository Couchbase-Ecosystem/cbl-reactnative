import HeaderView from '@/components/HeaderView';
import React, { useState } from 'react';
import { DocumentEditorActionFormProps } from '@/types/documentEditorActionFormProps.type';
import { StyledTextInput } from '@/components/StyledTextInput';
import { useStyleScheme } from '@/components/Themed';
import { Divider } from '@gluestack-ui/themed';
import { useWidgetSelectOptions } from '@/hooks/useWidgetSelectOptions';
import SelectKeyValue from '@/components/SelectKeyValue';
import { useGeneratedWidgets } from '@/hooks/useGeneratedWidgets';

export default function DocumentEditorActionForm({
  documentId,
  setDocumentId,
  document,
  setDocument,
}: DocumentEditorActionFormProps) {
  const [selectKey, setSelectKey] = useState(0);

  const styles = useStyleScheme();
  const widgetOptions = useWidgetSelectOptions();
  const widgets = useGeneratedWidgets();

  function updateSelectedWidget(value: string) {
    const key = parseInt(value);
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
      <HeaderView name="Document Information" iconName="file-document" />
      <StyledTextInput
        style={{ marginBottom: 5 }}
        autoCapitalize="none"
        placeholder="Document Id"
        onChangeText={(documentIdText) => setDocumentId(documentIdText)}
        defaultValue={documentId}
      />
      <Divider style={{ marginTop: 5, marginBottom: 10, marginLeft: 8 }} />
      <StyledTextInput
        autoCapitalize="none"
        style={[
          styles.textInput,
          { height: undefined, minHeight: 120, marginTop: 5, marginBottom: 15 },
        ]}
        placeholder="JSON Document"
        onChangeText={(newText) => setDocument(newText)}
        defaultValue={document}
        multiline={true}
      />
      <HeaderView name="Generated Data" iconName="file-document-multiple" />
      <SelectKeyValue
        headerTitle="Select Document"
        onSelectChange={updateSelectedWidget}
        placeholder="Select a Generated Widget"
        items={widgetOptions}
      />
    </>
  );
}

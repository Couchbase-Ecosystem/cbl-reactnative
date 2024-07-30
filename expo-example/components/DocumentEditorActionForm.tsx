import HeaderView from '@/components/HeaderView';
import HeaderRunActionView from '@/components/HeaderRunActionView';
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
  handleUpdatePressed,
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
      <HeaderRunActionView
        name="Document Information"
        iconName="file-document-edit-outline"
        handleUpdatePressed={handleUpdatePressed}
      />
      <StyledTextInput
        autoCapitalize="none"
        placeholder="Document ID"
        onChangeText={(newText) => setDocumentId(newText)}
        defaultValue={documentId}
      />
      <Divider style={styles.dividerCollectionFormTextInput} />
      <StyledTextInput
        autoCapitalize="none"
        style={[
          styles.textInput,
          { height: undefined, minHeight: 120, marginTop: 5 },
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

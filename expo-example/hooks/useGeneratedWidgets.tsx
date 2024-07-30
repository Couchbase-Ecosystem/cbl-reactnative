import { useState, useEffect } from 'react';
import {
  DataGeneratorService,
  WidgetType,
} from '@/service/datagen/dataGeneratorService';

export const useGeneratedWidgets = () => {
  const [widgets, setWidgets] = useState<{
    [key: number]: WidgetType;
  }>([]);

  useEffect(() => {
    const service = new DataGeneratorService();
    const data = service.dictionaryDocs;
    setWidgets(data);
  }, []);

  return widgets;
};

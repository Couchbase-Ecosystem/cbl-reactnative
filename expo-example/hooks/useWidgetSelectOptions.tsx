import { useState, useEffect } from 'react';
import { DataGeneratorService } from '@/service/datagen/dataGeneratorService';

export const useWidgetSelectOptions = () => {
  const [widgetOptions, setWidgetOptions] = useState<
    { key: string; value: string }[]
  >([]);

  useEffect(() => {
    const service = new DataGeneratorService();
    const options = service.getWidgetOptions();
    setWidgetOptions(options);
  }, []);

  return widgetOptions;
};

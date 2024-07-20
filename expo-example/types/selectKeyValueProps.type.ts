export type SelectKeyValueProps = {
  headerTitle: string;
  onSelectChange: (value: string) => void;
  placeholder: string;
  items: { key: string; value: string }[];
};

export type HeaderToolbarViewProps = {
  name: String;
  iconName: any;
  icons: Array<{
    iconName: any;
    onPress: () => void;
  }>;
  style?: object;
};

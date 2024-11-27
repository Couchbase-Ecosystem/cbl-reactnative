export type TestToolbarHeaderViewProps = {
	showDetails: boolean;
	setShowDetails: (showDetails: boolean) => void;
	icons: Array<{
	  iconName: any;
	  onPress: () => void;
	}>;
	style?: object;
  };
  
export type BaseStylesType = {
  container: {
    flex: number;
  };
  header: {
    fontSize: number;
    fontWeight: 'bold';
    paddingStart: number;
    paddingEnd: number;
    paddingTop: number;
    paddingBottom: number;
    flexDirection: 'row';
    alignItems: 'center';
  };
  itemContainer: {
    flexDirection: 'row';
    justifyContent: 'space-between';
    alignItems: 'center';
    padding: number;
    borderBottomWidth: number;
  };
  textInput: {
    height: number;
    paddingStart: number;
  };
  link: {
    padding: number;
    fontSize: number;
  };
};

export interface NavigationSectionItem {
  id: number;
  title: string;
  path: string;
}

export interface NavigationSectionType {
  title: string;
  icon: string;
  data: NavigationSectionItem[];
}

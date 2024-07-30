import { EngineLocator, ICoreEngine } from 'cbl-reactnative';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  quantity: number;
  location: string;
  createdOn: Date;
  isOnSale: boolean;
}

export interface ProductType {
  id: string;
  doc: Product;
}

export interface Widget {
  id: string;
  name: string;
  description: string;
  startedDate: string;
  stopDate: string;
  itemCount: number;
  active: boolean;
}

export interface WidgetType {
  id: string;
  doc: Widget;
}

export class DataGeneratorService {
  engine: ICoreEngine = EngineLocator.getEngine(EngineLocator.key);
  //generate random ids/keys for documents
  widgetIds: string[] = Array(21)
    .fill(0)
    .map(() => this.engine.getUUID());
  productIds: string[] = Array(11)
    .fill(0)
    .map(() => this.engine.getUUID());

  //used for query builder testing of group, having, and order by
  productDocs: { [key: number]: ProductType } = {
    0: {
      id: this.productIds[0],
      doc: {
        id: this.productIds[0],
        name: 'Smartphone X12',
        category: 'Electronics',
        price: 1010.23,
        quantity: 5,
        location: 'Warehouse 1',
        createdOn: new Date('2024-01-01T00:00:00.000Z'),
        isOnSale: false,
      },
    },
    1: {
      id: this.productIds[1],
      doc: {
        id: this.productIds[1],
        name: 'Laptop Pro 15',
        category: 'Electronics',
        price: 501.99,
        quantity: 10,
        location: 'Warehouse 1',
        createdOn: new Date('2024-02-01T00:00:00.000Z'),
        isOnSale: false,
      },
    },
    2: {
      id: this.productIds[2],
      doc: {
        id: this.productIds[2],
        name: 'Bluetooth Speaker Mini',
        category: 'Electronics',
        price: 130.0,
        quantity: 0,
        location: 'Warehouse 1',
        createdOn: new Date('2024-03-01T00:00:00.000Z'),
        isOnSale: false,
      },
    },
    3: {
      id: this.productIds[3],
      doc: {
        id: this.productIds[3],
        name: 'Wireless Earbuds',
        category: 'Electronics',
        price: 299.0,
        quantity: 100,
        location: 'Warehouse 1',
        createdOn: new Date('2024-02-15T00:00:00.000Z'),
        isOnSale: true,
      },
    },
    4: {
      id: this.productIds[4],
      doc: {
        id: this.productIds[4],
        name: 'Smartwatch Fitness Plus',
        category: 'Electronics',
        price: 499.0,
        quantity: 51,
        location: 'Warehouse 1',
        createdOn: new Date('2024-01-30T00:00:00.000Z'),
        isOnSale: true,
      },
    },
    5: {
      id: this.productIds[5],
      doc: {
        id: this.productIds[5],
        name: 'LED Desk Lamp',
        category: 'Home',
        price: 161.38,
        quantity: 21,
        location: 'Warehouse 2',
        createdOn: new Date('2024-01-30T00:00:00.000Z'),
        isOnSale: false,
      },
    },
    6: {
      id: this.productIds[6],
      doc: {
        id: this.productIds[6],
        name: 'Electric Kettle QuickBoil',
        category: 'Home',
        price: 175.45,
        quantity: 34,
        location: 'Warehouse 2',
        createdOn: new Date('2024-01-30T00:00:00.000Z'),
        isOnSale: false,
      },
    },
    7: {
      id: this.productIds[7],
      doc: {
        id: this.productIds[7],
        name: 'Microfiber Comforter Set',
        category: 'Home',
        price: 181.84,
        quantity: 40,
        location: 'Warehouse 2',
        createdOn: new Date('2024-01-30T00:00:00.000Z'),
        isOnSale: true,
      },
    },
    8: {
      id: this.productIds[8],
      doc: {
        id: this.productIds[8],
        name: 'Ceramic Non-Stick Pan',
        category: 'Kitchen',
        price: 192.04,
        quantity: 45,
        location: 'Warehouse 3',
        createdOn: new Date('2024-01-30T00:00:00.000Z'),
        isOnSale: false,
      },
    },
    9: {
      id: this.productIds[9],
      doc: {
        id: this.productIds[9],
        name: 'Robot Vacuum CleanMax',
        category: 'Home',
        price: 202.03,
        quantity: 23,
        location: 'Warehouse 2',
        createdOn: new Date('2024-01-30T00:00:00.000Z'),
        isOnSale: true,
      },
    },
    10: {
      id: this.productIds[10],
      doc: {
        id: this.productIds[10],
        name: 'Cheese Slicer and Dicer 5000',
        category: 'Kitchen',
        price: 25.99,
        quantity: 1001,
        location: 'Warehouse 3',
        createdOn: new Date('2023-12-31T00:00:00.000Z'),
        isOnSale: true,
      },
    },
  };

  //used for testing of document editor and blobs
  dictionaryDocs: { [key: number]: WidgetType } = {
    0: {
      id: this.widgetIds[0],
      doc: {
        id: this.widgetIds[0],
        name: 'QK2RPKZE6A Container',
        description:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
        startedDate: '2024-01-01T00:00:00.000Z',
        stopDate: '2024-12-31T00:00:00.000Z',
        itemCount: 32,
        active: true,
      },
    },
    1: {
      id: this.widgetIds[1],
      doc: {
        id: this.widgetIds[1],
        name: '3BOFSU7NO8 Container',
        description:
          'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
        startedDate: '2024-02-01T00:00:00.000Z',
        stopDate: '2024-11-30T00:00:00.000Z',
        itemCount: 100,
        active: true,
      },
    },
    2: {
      id: this.widgetIds[2],
      doc: {
        id: this.widgetIds[2],
        name: 'PS1I7 Bale',
        description:
          'A metallic bale used for storing and transporting parts. Ideal for warehouse organization and logistics.',
        startedDate: '2024-03-01T00:00:00.000Z',
        stopDate: '2024-11-30T00:00:00.000Z',
        itemCount: 223,
        active: true,
      },
    },
    3: {
      id: this.widgetIds[3],
      doc: {
        id: this.widgetIds[3],
        name: '6JLJER1WC Drum',
        description:
          'A steel drum used for storing and transporting food. Ideal for warehouse organization and logistics.',
        startedDate: '2024-04-01T00:00:00.000Z',
        stopDate: '2024-10-31T00:00:00.000Z',
        itemCount: 13,
        active: true,
      },
    },
    4: {
      id: this.widgetIds[4],
      doc: {
        id: this.widgetIds[4],
        name: 'H6W2C Bale',
        description:
          'A steel bale used for storing and transporting furniture. Ideal for warehouse organization and logistics.',
        startedDate: '2024-05-01T00:00:00.000Z',
        stopDate: '2024-09-30T00:00:00.000Z',
        itemCount: 1001,
        active: true,
      },
    },
    5: {
      id: this.widgetIds[5],
      doc: {
        id: this.widgetIds[5],
        name: '8U3IP5CRFD Barrel',
        description:
          'A aluminum barrel used for storing and transporting clothes. Ideal for warehouse organization and logistics.',
        startedDate: '2024-01-01T00:00:00.000Z',
        stopDate: '2024-12-31T00:00:00.000Z',
        itemCount: 2002,
        active: true,
      },
    },
    6: {
      id: this.widgetIds[6],
      doc: {
        id: this.widgetIds[6],
        name: 'U3A0JUT0T Rack',
        description:
          'A wooden rack used for storing and transporting decor. Ideal for warehouse organization and logistics.',
        startedDate: '2024-02-01T00:00:00.000Z',
        stopDate: '2024-09-30T00:00:00.000Z',
        itemCount: 5001,
        active: true,
      },
    },
    7: {
      id: this.widgetIds[7],
      doc: {
        id: this.widgetIds[7],
        name: '7M842YM Box',
        description:
          'A fabric box used for storing and transporting clothes. Ideal for warehouse organization and logistics.',
        startedDate: '2024-08-01T00:00:00.000Z',
        stopDate: '2024-09-30T00:00:00.000Z',
        itemCount: 2,
        active: true,
      },
    },
    8: {
      id: this.widgetIds[8],
      doc: {
        id: this.widgetIds[8],
        name: '5VWGO8F Shelf',
        description:
          'A wooden shelf used for storing and transporting supplies. Ideal for warehouse organization and logistics.',
        startedDate: '2024-09-01T00:00:00.000Z',
        stopDate: '2024-10-31T00:00:00.000Z',
        itemCount: 48,
        active: true,
      },
    },
    9: {
      id: this.widgetIds[9],
      doc: {
        id: this.widgetIds[9],
        name: '0TBZKCIQ Bale',
        description:
          'A wooden bale used for storing and transporting food. Ideal for warehouse organization and logistics.',
        startedDate: '2025-01-01T00:00:00.000Z',
        stopDate: '2025-12-31T00:00:00.000Z',
        itemCount: 1994,
        active: true,
      },
    },
    10: {
      id: this.widgetIds[10],
      doc: {
        id: this.widgetIds[10],
        name: 'MNAQX6SX6O Box',
        description:
          'A composite box used for storing and transporting books. Ideal for warehouse organization and logistics.',
        startedDate: '2023-01-01T00:00:00.000Z',
        stopDate: '2023-12-31T00:00:00.000Z',
        itemCount: 2004,
        active: false,
      },
    },
    11: {
      id: this.widgetIds[11],
      doc: {
        id: this.widgetIds[11],
        name: 'KWHO4 Container Box',
        description:
          'A metallic container used for storing and transporting tools. Ideal for warehouse organization and logistics.',
        startedDate: '2022-01-01T00:00:00.000Z',
        stopDate: '2022-12-31T00:00:00.000Z',
        itemCount: 1991,
        active: false,
      },
    },
    12: {
      id: this.widgetIds[12],
      doc: {
        id: this.widgetIds[12],
        name: 'Q9QNGDW3 Drum',
        description:
          'A fabric drum used for storing and transporting furniture. Ideal for warehouse organization and logistics.',
        startedDate: '2021-01-01T00:00:00.000Z',
        stopDate: '2021-12-31T00:00:00.000Z',
        itemCount: 1984,
        active: false,
      },
    },
    13: {
      id: this.widgetIds[13],
      doc: {
        id: this.widgetIds[13],
        name: 'DG6MP12 Container',
        description:
          'A composite container used for storing and transporting food. Ideal for warehouse organization and logistics.',
        startedDate: '2024-07-01T00:00:00.000Z',
        stopDate: '2024-08-30T00:00:00.000Z',
        itemCount: 10009,
        active: true,
      },
    },
    14: {
      id: this.widgetIds[14],
      doc: {
        id: this.widgetIds[14],
        name: 'BG5DHG Barrel',
        description:
          'A aluminum barrel used for storing and transporting decor. Ideal for warehouse organization and logistics.',
        startedDate: '2024-06-01T00:00:00.000Z',
        stopDate: '2024-07-30T00:00:00.000Z',
        itemCount: 9,
        active: true,
      },
    },
    15: {
      id: this.widgetIds[15],
      doc: {
        id: this.widgetIds[15],
        name: 'I6FGP7H6T Bale',
        description:
          'A fabric bale used for storing and transporting food. Ideal for warehouse organization and logistics.',
        startedDate: '2024-06-01T00:00:00.000Z',
        stopDate: '2024-07-30T00:00:00.000Z',
        itemCount: 34,
        active: true,
      },
    },
    16: {
      id: this.widgetIds[16],
      doc: {
        id: this.widgetIds[16],
        name: '2V5JK Crate',
        description:
          'A cardboard crate used for storing and transporting tools. Ideal for warehouse organization and logistics.',
        startedDate: '2024-02-01T23:59:59.000Z',
        stopDate: '2024-03-30T23:59:59.000Z',
        itemCount: 57,
        active: true,
      },
    },
    17: {
      id: this.widgetIds[17],
      doc: {
        id: this.widgetIds[17],
        name: 'FD8UJ Shelf',
        description:
          'A metallic shelf used for storing and transporting food. Ideal for warehouse organization and logistics.',
        startedDate: '2024-01-01T23:59:59.000Z',
        stopDate: '2024-12-31T23:59:59.000Z',
        itemCount: 90,
        active: true,
      },
    },
    18: {
      id: this.widgetIds[18],
      doc: {
        id: this.widgetIds[18],
        name: 'YTMWNC Drum',
        description:
          'A aluminum drum used for storing and transporting clothes. Ideal for warehouse organization and logistics.',
        startedDate: '2028-01-01T23:59:59.000Z',
        stopDate: '2028-12-31T23:59:59.000Z',
        itemCount: 40,
        active: true,
      },
    },
    19: {
      id: this.widgetIds[19],
      doc: {
        id: this.widgetIds[19],
        name: '5YZK61V9 Crate',
        description:
          'At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium voluptatum deleniti atque corrupti quos dolores et quas molestias excepturi sint occaecati cupiditate non provident, similique sunt in culpa qui officia deserunt mollitia animi, id est laborum et dolorum fuga. Et harum quidem rerum facilis est et expedita distinctio. Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus id quod maxime placeat facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. Temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet ut et voluptates repudiandae sint et molestiae non recusandae. Itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.',
        startedDate: '2023-01-01T23:59:59.000Z',
        stopDate: '2023-12-31T23:59:59.000Z',
        itemCount: 52,
        active: true,
      },
    },
    20: {
      id: this.widgetIds[20],
      doc: {
        id: this.widgetIds[20],
        name: 'UAEBAL NORAA Easter Egg',
        description:
          'A Robot used for generating sample data using modern AI tools.',
        startedDate: '1975-10-12T11:23:00.000Z',
        stopDate: '2045-10-12T23:59:59.000Z',
        itemCount: 70,
        active: true,
      },
    },
  };

  getWidgetOptions() {
    const dictionary: { key: string; value: string }[] = [];
    for (const key in this.dictionaryDocs) {
      dictionary.push({
        key: this.dictionaryDocs[key].doc.name,
        value: key,
      });
    }
    return dictionary;
  }

  getRandomWidget(): WidgetType {
    const randomIndex = Math.floor(Math.random() * 19);
    return this.dictionaryDocs[randomIndex];
  }
}

/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */

// Mina account address as base58
type Address = string;
type ValueRecord = Record<string, string[]>;

interface StorageAdapter {
  isReady: () => Promise<void>;

  initialize: (consensus: ConsensusBridge) => Promise<void>;

  // returns serializedWitness
  getWitness: (
    account: Address,
    mapName: string,
    key: string
  ) => Promise<string | undefined>;

  getValues: (
    account: Address,
    keys: string[]
  ) => Promise<ValueRecord | undefined>;

  setValue: (account: Address, valueRecord: ValueRecord) => Promise<void>;
}

interface EventParserAdapter<Storage extends StorageAdapter> {
  initialize: (zkfsNode: ZkfsNode<Storage>) => Promise<void>;
  fetchLocalEvents: () => Promise<void>;
}

interface Service<Storage extends StorageAdapter> {
  initialize: (zkfsNode: ZkfsNode<Storage>) => Promise<void>;
}

interface ConsensusBridge {
  verifyComputedRoot: (
    account: Address,
    computedRoot: string
  ) => Promise<boolean>;
}

interface ZkfsNodeConfig<Storage extends StorageAdapter> {
  storage: Storage;
  consensus: ConsensusBridge;
  services?: Service<Storage>[];
  eventParser?: EventParserAdapter<Storage>;
}

interface ZkfsWriterNodeConfig<Storage extends StorageAdapter> {
  storage: Storage;
  consensus: ConsensusBridge;
  services: Service<Storage>[];
  eventParser: EventParserAdapter<Storage>;
}

interface ZkfsNode<Storage extends StorageAdapter> {
  storage: Storage;
  consensus: ConsensusBridge;
  services?: Service<Storage>[];
  eventParser?: EventParserAdapter<Storage>;
  start: () => Promise<void>;
}

// eslint-disable-next-line import/no-unused-modules
export type {
  Service,
  ZkfsNodeConfig,
  ZkfsNode,
  StorageAdapter,
  ValueRecord,
  Address,
  EventParserAdapter,
  ZkfsWriterNodeConfig,
  ConsensusBridge,
};

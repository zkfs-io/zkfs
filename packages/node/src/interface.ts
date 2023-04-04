/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
type SerializedMerkleMap = string;

// Mina account address as base58
type Address = string;
type ValueRecord = Record<string, string[]>;

interface StorageAdapter {
  isReady: () => Promise<void>;

  initialize: () => Promise<void>;

  // returns serializedWitness
  getWitness: (
    account: Address,
    mapName: string,
    key: string
  ) => Promise<string | undefined>;

  // writer node needs to have event parser configured
  // light-client uses different implementation, without event parser

  /**
   * @deprecated The method should not be used
   */
  getMap: (
    account: Address,
    mapName: string
  ) => Promise<SerializedMerkleMap | undefined>;

  getValues: (
    account: Address,
    keys: string[]
  ) => Promise<ValueRecord | undefined>;

  setMap: (
    account: Address,
    map: SerializedMerkleMap,
    mapName: string
  ) => Promise<void>;
  setValue: (account: Address, valueRecord: ValueRecord) => Promise<void>;
}

interface EventParserAdapter<Storage extends StorageAdapter> {
  initialize: (zkfsNode: ZkfsNode<Storage>) => Promise<void>;
  fetchLocalEvents: () => Promise<void>;
}

interface Service<Storage extends StorageAdapter> {
  initialize: (zkfsNode: ZkfsNode<Storage>) => Promise<void>;
}

interface ZkfsNodeConfig<Storage extends StorageAdapter> {
  storage: Storage;
  services?: Service<Storage>[];
  eventParser?: EventParserAdapter<Storage>;
}

interface ZkfsWriterNodeConfig<Storage extends StorageAdapter> {
  storage: Storage;
  services: Service<Storage>[];
  eventParser: EventParserAdapter<Storage>;
}

interface ZkfsNode<Storage extends StorageAdapter> {
  storage: Storage;
  services?: Service<Storage>[];
  eventParser?: EventParserAdapter<Storage>;
  start: () => Promise<void>;
}

export type {
  Service,
  ZkfsNodeConfig,
  ZkfsNode,
  StorageAdapter,
  ValueRecord,
  Address,
  EventParserAdapter,
  ZkfsWriterNodeConfig
};

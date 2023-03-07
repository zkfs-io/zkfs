/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
type SerializedMerkleMap = string;

// Mina account address as base58
type Address = string;
type ValueRecord = Record<string, string[]>;

interface StorageAdapter {
  isReady: () => Promise<void>;

  initialize: () => Promise<void>;

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

interface EventParserAdapter {}

interface Service {
  initialize: (zkfsNode: ZkfsNode<StorageAdapter>) => Promise<void>;
}

interface ZkfsNodeConfig<Storage extends StorageAdapter> {
  storage: Storage;
  services?: Service[];
}

interface ZkfsNode<Storage extends StorageAdapter> {
  storage: Storage;
  services?: Service[];
  eventParser?: EventParserAdapter;
  start: () => Promise<void>;
}

export type {
  Service,
  ZkfsNodeConfig,
  ZkfsNode,
  StorageAdapter,
  ValueRecord,
  Address,
};

/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
interface Service {
  initialize: (zkfsNode: ZkfsNode) => Promise<void>;
}

type SerializedMerkleMap = string;

// Mina account address as base58
type Address = string;
type ValueRecord = Record<string, string[]>;

interface StorageAdapter {
  isReady: () => Promise<void>;

  initialize: () => Promise<void>;

  getMap: (account: Address) => Promise<SerializedMerkleMap>;
  getValues: (account: Address, keys: string[]) => Promise<ValueRecord>;

  setMap: (account: Address, map: SerializedMerkleMap) => Promise<void>;
  setValue: (account: Address, value: ValueRecord) => Promise<void>;
}

interface EventParserAdapter {}

interface ZkfsNodeConfig {
  storage: StorageAdapter;
  services?: Service[];
}

interface ZkfsNode<Storage = StorageAdapter> {
  storage: Storage;
  services?: Service[];
  eventParser?: EventParserAdapter;
}

export type {
  Service,
  ZkfsNodeConfig,
  ZkfsNode,
  StorageAdapter,
  ValueRecord,
  Address,
};

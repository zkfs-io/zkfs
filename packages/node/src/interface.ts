/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
interface Service {
  initialize: (zkfsNode: ZkfsNode) => Promise<void>;
}

type SerializedMerkleMap = string;

// Mina account address as base58
// eslint-disable-next-line @typescript-eslint/naming-convention
type address = string;
type ValueRecord = Record<string, string[]>;

interface StorageAdapter {
  isReady: () => Promise<void>;

  initialize: () => Promise<void>;

  getMap: (account: address) => Promise<SerializedMerkleMap>;
  getValues: (account: address, keys: string[]) => Promise<ValueRecord>;

  setMap: (account: address, map: SerializedMerkleMap) => Promise<void>;
  setValue: (account: address, value: ValueRecord) => Promise<void>;
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

export type { Service, ZkfsNodeConfig, ZkfsNode, StorageAdapter, ValueRecord };

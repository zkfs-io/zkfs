/* eslint-disable unicorn/prevent-abbreviations */
type SerializedMerkleMap = string;

// Mina account address as base58
// eslint-disable-next-line @typescript-eslint/naming-convention
type address = string;
type ValueRecord = Record<string, string[]>;

interface StorageAdapter {
  isReady: () => Promise<void>;

  initialize: () => Promise<void>;

  getMap: (account: address) => Promise<SerializedMerkleMap>;
  getValues(account: address, keys: string[]): Promise<ValueRecord>;

  setMap: (account: address, map: SerializedMerkleMap) => Promise<void>;
  setValue: (account: address, value: ValueRecord) => Promise<void>;
}

interface OrbitDbStorageConfig {}

export type { StorageAdapter, OrbitDbStorageConfig, ValueRecord };

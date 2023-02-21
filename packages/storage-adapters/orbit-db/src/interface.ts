type SerializedMerkleMap = string;

// Mina account address as base58
// eslint-disable-next-line @typescript-eslint/naming-convention
type address = string;
type ValueRecord = Record<string, string[]>;

interface StorageAdapter {
  isReady: () => Promise<void>;

  getMap: (account: address) => Promise<SerializedMerkleMap>;
  getValues: (account: address, keys: string[]) => Promise<ValueRecord>;

  registerAccount: (account: address) => Promise<void>;

  // consider returning CID
  setMap: (account: address, map: SerializedMerkleMap) => Promise<void>;
  setValue: (account: address, value: ValueRecord) => Promise<void>;
}

interface OrbitDbStorageConfig {
  bootstrap: {
    /**
     * Polling interval in ms for checking peer connections.
     */
    interval: number;

    /**
     * Timeout when checking for connected peers.
     */
    timeout: number;
  };
}

export { StorageAdapter, OrbitDbStorageConfig };

interface StorageAdapter {
  isReady(): Promise<void>;
  isConnected(): Promise<boolean>;

  getMap(account: address): Promise<SerializedMerkleMap>;
  getValues(account: address, keys: string[]): Promise<ValueRecord>;

  registerAccount(account: address): Promise<void>;

  // consider returning CID
  setMap(account: address, map: SerializedMerkleMap): Promise<void>;
  setValue(account: address, value: ValueRecord): Promise<void>;
}

interface PeersConfig {
  addresses: string[];
  interval: number;
  timeout: number;
}

export { StorageAdapter, PeersConfig };

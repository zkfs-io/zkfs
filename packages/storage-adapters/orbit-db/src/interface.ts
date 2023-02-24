/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable lines-around-comment */
/* eslint-disable unicorn/prevent-abbreviations */
import type { IPFS } from 'ipfs-core';

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

interface OrbitDbStoragePartialConfig {
  ipfs: IPFS;
  /**
   * A list of Mina account addresses to be watched.
   */
  addresses: address[];

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

interface OrbitDbStorageLightConfig
  extends Omit<OrbitDbStoragePartialConfig, 'addresses'> {
  pubsub: {
    /**
     * Timeout for retrieving maps/values from peers.
     */
    timeout: number;
  };
}

export type {
  StorageAdapter,
  OrbitDbStoragePartialConfig,
  OrbitDbStorageLightConfig,
  ValueRecord,
};

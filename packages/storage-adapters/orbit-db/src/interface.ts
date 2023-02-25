/* eslint-disable lines-around-comment */
/* eslint-disable unicorn/prevent-abbreviations */
import type { IPFS } from 'ipfs-core';

// eslint-disable-next-line import/no-relative-packages
import type { Address } from '../../../node/src/interface.js';

interface OrbitDbStoragePartialConfig {
  ipfs: IPFS;
  /**
   * A list of Mina account addresses to be watched.
   */
  addresses: Address[];

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

export type { OrbitDbStoragePartialConfig, OrbitDbStorageLightConfig, Address };

export type {
  ValueRecord,
  StorageAdapter,
  // eslint-disable-next-line import/no-relative-packages
} from '../../../node/src/interface.js';

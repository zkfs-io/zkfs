/* eslint-disable lines-around-comment */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable @typescript-eslint/no-misused-promises */
/* eslint-disable unicorn/prevent-abbreviations */
import { multiaddr } from '@multiformats/multiaddr';
// eslint-disable-next-line id-length
import _ from 'lodash';
import type { PeerId } from '@libp2p/interface-peer-id';
import OrbitDB from 'orbit-db';
import type KeyValueStore from 'orbit-db-kvstore';
import type { IPFS } from 'ipfs-core';

import type {
  StorageAdapter,
  ValueRecord,
  OrbitDbStoragePartialConfig,
} from './interface.js';
import errorBootstrapNodesNotConnected from './errors.js';

interface PartialPeersResult {
  peer: PeerId;
}

class OrbitDbStoragePartial implements StorageAdapter {
  public storeInstances: Record<string, KeyValueStore<string>>;

  public ipfsNode: IPFS;

  public databasePrefix = '';

  public orbitDb: OrbitDB;

  public setValue: (account: string, value: ValueRecord) => Promise<void>;

  public getValues: (account: string, keys: string[]) => Promise<ValueRecord>;

  public constructor(public config: OrbitDbStoragePartialConfig) {}

  public getZkfsMapPath(account: string) {
    return `${this.databasePrefix}zkfs.map.${account}`;
  }

  public async getMap(account: string): Promise<string> {
    // eslint-disable-next-line promise/avoid-new
    return await new Promise((resolve) => {
      resolve(this.storeInstances[this.getZkfsMapPath(account)].get('root'));
    });
  }

  public async getMapOrbitDbAddress(account: string) {
    return await this.orbitDb.determineAddress(
      this.getZkfsMapPath(account),
      'keyvalue'
    );
  }

  public async initialize(): Promise<void> {
    this.orbitDb = await OrbitDB.createInstance(this.config.ipfs);

    const orbitDbStoresMapArray = await Promise.all(
      this.config.addresses.map(async (address) => {
        const dbAddress = await this.getMapOrbitDbAddress(address);
        const keyValueStore = await this.orbitDb.keyvalue<string>(
          dbAddress.toString()
        );
        await keyValueStore.load();

        return { [this.getZkfsMapPath(address)]: keyValueStore };
      })
    );

    orbitDbStoresMapArray.forEach((store) => {
      this.storeInstances = { ...this.storeInstances, ...store };
    });
  }

  public async isReady(): Promise<void> {
    const bootstrapAddressConfig =
      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      ((await this.config.ipfs.config.get('Bootstrap')) as
        | string[]
        | undefined) ?? [];
    const bootstrapAddressList = bootstrapAddressConfig.map((address) =>
      multiaddr(address).getPeerId()
    );

    // eslint-disable-next-line promise/avoid-new
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(errorBootstrapNodesNotConnected));
      }, this.config.bootstrap.timeout);

      const timerId = setInterval(async () => {
        const peersResult =
          // @typescript-eslint/consistent-type-assertions
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
          ((await this.config.ipfs.swarm.peers()) as
            | PartialPeersResult[]
            | undefined) ?? [];
        const connectedPeers = peersResult.map(({ peer }) => peer.toString());
        const isConnectedToBootstrap =
          _.difference(bootstrapAddressList, connectedPeers).length === 0;

        if (isConnectedToBootstrap) {
          clearTimeout(timeoutId);
          clearInterval(timerId);
          resolve();
        }
      }, this.config.bootstrap.interval);
    });
  }

  public async setMap(account: string, map: string): Promise<void> {
    await this.storeInstances[this.getZkfsMapPath(account)].set('root', map);
  }
}

export default OrbitDbStoragePartial;

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
import type { VirtualStorage } from '@zkfs/virtual-storage';

import type {
  StorageAdapter,
  ValueRecord,
  OrbitDbStoragePartialConfig,
  Address,
  OrbitDbAddress,
} from './interface.js';
import errorBootstrapNodesNotConnected from './errors.js';

interface PartialPeersResult {
  peer: PeerId;
}

class OrbitDbStoragePartial implements StorageAdapter {
  public storeInstances:
    | Record<OrbitDbAddress, KeyValueStore<string> | undefined>
    | undefined;

  public ipfsNode: IPFS | undefined;

  public databasePrefix = '';

  public orbitDb: OrbitDB | undefined;

  public virtualStorage: VirtualStorage;

  public constructor(public config: OrbitDbStoragePartialConfig) {
    this.virtualStorage = this.config.virtualStorage;
  }

  public saveStoreInstances(
    orbitDbStoresArray: Record<OrbitDbAddress, KeyValueStore<string>>[]
  ) {
    orbitDbStoresArray.forEach((store) => {
      this.storeInstances = { ...this.storeInstances, ...store };
    });
  }

  public getZkfsMapPath(account: string) {
    return `${this.databasePrefix}zkfs.map.${account}`;
  }

  public getZkfsValuePath(account: string) {
    return `${this.databasePrefix}zkfs.value.${account}`;
  }

  public getMapStore(account: Address): KeyValueStore<string> | undefined {
    if (!this.storeInstances) {
      console.error(
        'Store instances not initialized, have you called .initialize()?'
      );

      return undefined;
    }
    const mapPath = this.getZkfsMapPath(account);
    if (!this.storeInstances[mapPath]) {
      console.error(
        `Failed to fetch map store for unregistered account ${account}`
      );
      return undefined;
    }
    return this.storeInstances[mapPath];
  }

  public getValueStore(account: Address): KeyValueStore<string> | undefined {
    if (!this.storeInstances) {
      console.error(
        'Store instances not initialized, have you called .initialize()?'
      );

      return undefined;
    }
    const valuePath = this.getZkfsValuePath(account);
    if (!this.storeInstances[valuePath]) {
      console.error(
        `Failed to fetch value store for unregistered account ${account}`
      );
      return undefined;
    }
    return this.storeInstances[valuePath];
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async getWitness(
    account: string,
    mapName: string,
    key: string
  ): Promise<string | undefined> {
    return this.virtualStorage.getSerializedWitness(account, mapName, key);
  }

  public async setValue(
    account: string,
    valueRecord: ValueRecord
  ): Promise<void> {
    const [[key, value]] = Object.entries(valueRecord);
    // todo check whether store exists before setting
    // shouldn't be possible if store was not registered
    await this.getValueStore(account)?.set(key, JSON.stringify(value));
  }

  /**
   * Get the value store for the given account, and if it exists,
   * get the values for the given keys and return them as a ValueRecord.
   *
   * @param {Address} account - Address - The address of the account to get the values from
   * @param {string[]} keys - string[] - An array of keys to get values for.
   * @returns The values of the keys in the store.
   */
  public async getValues(
    account: Address,
    keys: string[]
  ): Promise<ValueRecord | undefined> {
    const store = this.getValueStore(account);
    if (store === undefined) {
      console.log('account not registered in DB');
      return undefined;
    }
    const values: ValueRecord = {};
    for (const key of keys) {
      const value = store.get(key);
      if (value !== undefined) {
        values[String(key)] = JSON.parse(value);
      }
    }
    return Object.keys(values).length > 0 ? values : undefined;
  }

  public async getMap(
    account: Address,
    mapName: string
  ): Promise<string | undefined> {
    // eslint-disable-next-line promise/avoid-new
    return await new Promise((resolve) => {
      const mapStore = this.getMapStore(account);
      if (mapStore === undefined) {
        console.log('account not registered in DB');
        resolve(undefined);
      } else {
        resolve(mapStore.get(mapName));
      }
    });
  }

  public async getMapOrbitDbAddress(account: Address) {
    if (!this.orbitDb) {
      throw new Error(
        'OrbitDb instance undefined, have you called .initialized()?'
      );
    }
    return await this.orbitDb.determineAddress(
      this.getZkfsMapPath(account),
      'keyvalue'
    );
  }

  public async initialize(): Promise<void> {
    this.orbitDb = await OrbitDB.createInstance(this.config.ipfs);

    // create for list of addresses all map orbit-db stores
    const orbitDbStoresMapArray = await this.createAndLoadMapStores(
      this.config.addresses
    );
    // save all map store instances
    this.saveStoreInstances(orbitDbStoresMapArray);

    // create for list of addresses all value orbit-db stores
    const orbitDbStoresValueArray = await this.createAndLoadValueStores(
      this.config.addresses
    );
    // save all value stores instances
    this.saveStoreInstances(orbitDbStoresValueArray);
  }

  public async createAndLoadValueStores(addresses: string[]) {
    if (!this.orbitDb) {
      throw new Error(
        'OrbitDb instance undefined, have you called .initialized()?'
      );
    }
    return await Promise.all(
      addresses.map(async (address) => {
        const dbAddress = await this.getValueOrbitDbAddress(address);
        // TODO: remove forbidden non-null assertion
        const keyValueStore = await this.orbitDb!.keyvalue<string>(
          dbAddress.toString()
        );
        await keyValueStore.load();

        return { [this.getZkfsValuePath(address)]: keyValueStore };
      })
    );
  }

  public async createAndLoadMapStores(addresses: Address[]) {
    if (!this.orbitDb) {
      throw new Error(
        'OrbitDb instance undefined, have you called .initialized()?'
      );
    }
    return await Promise.all(
      addresses.map(async (address) => {
        const dbAddress = await this.getMapOrbitDbAddress(address);
        const keyValueStore = await this.orbitDb!.keyvalue<string>(
          dbAddress.toString()
        );
        await keyValueStore.load();

        return { [this.getZkfsMapPath(address)]: keyValueStore };
      })
    );
  }

  public async getValueOrbitDbAddress(account: Address) {
    if (!this.orbitDb) {
      throw new Error(
        'OrbitDb instance undefined, have you called .initialized()?'
      );
    }
    return await this.orbitDb.determineAddress(
      this.getZkfsValuePath(account),
      'keyvalue'
    );
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

  public async setMap(
    account: Address,
    map: string,
    mapName: string
  ): Promise<void> {
    // eslint-disable-next-line no-warning-comments
    // todo check whether store exists before setting
    // shouldn't be possible if store was not registered
    await this.getMapStore(account)?.set(mapName, map);
  }
}

export default OrbitDbStoragePartial;

/* eslint-disable no-warning-comments */
/* eslint-disable unicorn/prevent-abbreviations */
import { multiaddr } from '@multiformats/multiaddr';
import type { IPFS } from 'ipfs-core';
import _ from 'lodash';
import OrbitDB, { OrbitDBAddress } from 'orbit-db';
import KeyValueStore from 'orbit-db-kvstore';

import type { StorageAdapter, OrbitDbStorageConfig } from './interface.js';

class OrbitDbStorage implements StorageAdapter {
  public ipfsNode: IPFS;

  public orbitDbStorageConfig: OrbitDbStorageConfig;

  public orbitDb: OrbitDB;

  public constructor(options: {
    ipfs: IPFS;
    orbitDbStorageConfig: OrbitDbStorageConfig;
  }) {
    this.ipfsNode = options.ipfs;
    this.orbitDbStorageConfig = options.orbitDbStorageConfig;
  }

  /**
   * Initializes the OrbitDb within the storage adapter.
   */
  public async initialize(): Promise<void> {
    this.orbitDb = await OrbitDB.createInstance(this.ipfsNode);
  }

  /**
   * A promise that resolves when the provided IPFS instance is connected to all
   * bootstrap peers.
   */
  public async isReady(): Promise<void> {
    const bootstrapConfig =
      ((await this.ipfsNode.config.get('Bootstrap')) as string[] | undefined) ??
      [];

    const bootstrapList = bootstrapConfig.map((item) =>
      multiaddr(item).getPeerId()
    );

    //const bootstrapList = ipfsConfig.config.Bootstrap;
    // eslint-disable-next-line promise/avoid-new
    await new Promise<void>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Can't connect to ZKFS nodes as defined in config.`));
      }, this.orbitDbStorageConfig.bootstrap.timeout);

      const timerId = setInterval(async () => {
        const peersList: { peer: { toString: () => string } }[] =
          await this.ipfsNode.swarm.peers();
        const connectedPeers = peersList.map(({ peer }) => peer.toString());

        const isConnectedToConfiguredPeers =
          _.difference(bootstrapList, connectedPeers).length === 0;

        if (isConnectedToConfiguredPeers) {
          clearTimeout(timeoutId);

          // TODO clearing interval has no effect, add test cases
          clearInterval(timerId);
          resolve();
        }
      }, this.orbitDbStorageConfig.bootstrap.interval);
    });
  }

  public getValues(
    account: string,
    keys: string[]
  ): Promise<{ [x: string]: string[] }> {
    throw new Error('Method not implemented.');
  }

  public async openAccountsStore() {
    const dbAddress = await this.getRegisterAccountOrbitDbAddress();
    const keyValueStore = await this.orbitDb.keyvalue<boolean>(
      dbAddress.toString()
    );
    await keyValueStore.load();

    return keyValueStore;
  }

  public async registerAccount(account: string): Promise<void> {
    const keyValueStore = await this.openAccountsStore();
    await keyValueStore.set(account, true);
  }

  public async getRegisteredAccount(account: string) {
    const keyValueStore = await this.openAccountsStore();
    return keyValueStore.get(account);
  }

  public async getAllRegisteredAccounts() {
    const keyValueStore = await this.openAccountsStore();
    return keyValueStore.all;
  }

  public async getRegisterAccountOrbitDbAddress(): Promise<OrbitDBAddress> {
    return await this.orbitDb.determineAddress('zkfs.addresses', 'keyvalue');
  }

  public async getMapOrbitDbAddress(account: string) {
    return await this.orbitDb.determineAddress(
      `zkfs.map.${account}`,
      'keyvalue'
    );
  }

  public async openMapStore(account: string) {
    const dbAddress = await this.getMapOrbitDbAddress(account);
    const keyValueStore = await this.orbitDb.keyvalue<string>(
      dbAddress.toString()
    );
    await keyValueStore.load();

    return keyValueStore;
  }

  public async setMap(account: string, map: string): Promise<void> {
    const keyValueStore = await this.openMapStore(account);
    await keyValueStore.set('root', map);
  }

  public async getMap(account: string) {
    const keyValueStore = await this.openMapStore(account);
    return keyValueStore.get('root');
  }

  public async getValueOrbitDbAddress(account: string) {
    return await this.orbitDb.determineAddress(`zkfs.values.${account}`);
  }

  public async openValueStore(account: string) {
    const dbAddress = await this.getValueOrbitDbAddress(account);
    const keyValueStore = await this.orbitDb.keyvalue<string>(
      dbAddress.toString()
    );

    await keyValueStore.load();

    return keyValueStore;
  }

  public async setValue(
    account: string,
    value: { [x: string]: string[] }
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

export default OrbitDbStorage;

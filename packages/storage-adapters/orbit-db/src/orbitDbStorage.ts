/* eslint-disable no-warning-comments */
/* eslint-disable unicorn/prevent-abbreviations */
import { multiaddr } from '@multiformats/multiaddr';
import type { IPFS } from 'ipfs-core';
import _ from 'lodash';
import OrbitDB, { OrbitDBAddress } from 'orbit-db';

import type { StorageAdapter, PeersConfig } from './interface.js';

class OrbitDbStorage implements StorageAdapter {
  public ipfsNode: IPFS;

  public peersConfig: PeersConfig;

  public orbitDb: OrbitDB;

  public constructor(options: { ipfs: IPFS; peersConfig: PeersConfig }) {
    this.ipfsNode = options.ipfs;
    this.peersConfig = options.peersConfig;
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
      }, this.peersConfig.timeout);

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
      }, this.peersConfig.interval);
    });
  }

  public getMap(account: string): Promise<string> {
    throw new Error('Method not implemented.');
  }
  public getValues(
    account: string,
    keys: string[]
  ): Promise<{ [x: string]: string[] }> {
    throw new Error('Method not implemented.');
  }

  public async registerAccount(account: string): Promise<void> {
    const dbAddress = await this.getRegisterAccountOrbitDbAddress();
    const keyValueStore = await this.orbitDb.keyvalue(dbAddress.toString());

    // TODO: api change for value
    await keyValueStore.set(account, 'placeholder');
  }

  public async getRegisterAccountOrbitDbAddress(): Promise<OrbitDBAddress> {
    return await this.orbitDb.determineAddress('zkfs.addresses', 'keyvalue');
  }

  public setMap(account: string, map: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public setValue(
    account: string,
    value: { [x: string]: string[] }
  ): Promise<void> {
    throw new Error('Method not implemented.');
  }
}

export default OrbitDbStorage;

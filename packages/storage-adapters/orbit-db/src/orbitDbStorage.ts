/* eslint-disable no-warning-comments */
/* eslint-disable unicorn/prevent-abbreviations */
import type { IPFS } from 'ipfs-core';
import _ from 'lodash';
import OrbitDB from 'orbit-db';

import type { StorageAdapter, PeersConfig } from './interface.js';

class OrbitDbStorage implements StorageAdapter {
  public ipfsNode: IPFS;

  public peersConfig: PeersConfig;

  public orbitDb: OrbitDB;

  public constructor(options: { ipfs: IPFS; peersConfig: PeersConfig }) {
    this.ipfsNode = options.ipfs;
    this.peersConfig = options.peersConfig;
  }

  public async isConnected(): Promise<boolean> {
    try {
      await this.resolveWhenConnectedToPeers();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * A promise that resolves when the provided IPFS instance is connected to all
   * pre-configured peers.
   */
  public async resolveWhenConnectedToPeers(): Promise<void> {
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
          _.difference(this.peersConfig.addresses, connectedPeers).length === 0;

        if (isConnectedToConfiguredPeers) {
          clearTimeout(timeoutId);

          // TODO clearing interval has no effect, add test cases
          clearInterval(timerId);
          resolve();
        }
      }, this.peersConfig.interval);
    });
  }

  /**
   * A promise that resolves when the storage adapter is ready to be used.
   */
  public async isReady(): Promise<void> {
    await this.resolveWhenConnectedToPeers();
    this.orbitDb = await OrbitDB.createInstance(this.ipfsNode);
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
  public registerAccount(account: string): Promise<void> {
    throw new Error('Method not implemented.');
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

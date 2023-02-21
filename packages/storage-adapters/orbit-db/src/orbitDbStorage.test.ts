/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable unicorn/prevent-abbreviations */
import { create, type IPFS } from 'ipfs-core';
import OrbitDB from 'orbit-db';

import tearDownIpfs from '../test/utils.js';
import {
  createIpfsConfigBase,
  createIpfsConfigConnectingToPeers,
  createIpfsConfigOffline,
} from '../test/configs.js';

import OrbitDbStorage from './orbitDbStorage.js';
import type { OrbitDbStorageConfig } from './interface.js';

const extendedJestTimeout = 20_000;

describe('orbitDbStorage', () => {
  const orbitDbStorageConfig: OrbitDbStorageConfig = {
    bootstrap: { interval: 1000, timeout: 15_000 },
  };
  let remoteIpfsNodeId: string;

  beforeAll(async () => {
    const remoteIpfsNode = create(createIpfsConfigBase('ipfs-remote-node'));
    remoteIpfsNodeId = (await (await remoteIpfsNode).id()).id.toString();
  });

  afterAll(() => {
    tearDownIpfs();
  });

  describe('connecting to other peers', () => {
    it(
      'can connect to another IPFS node',
      async () => {
        expect.assertions(1);

        const ipfs = await create(
          createIpfsConfigConnectingToPeers('ipfs-storage-adapter-01', [
            remoteIpfsNodeId,
          ])
        );
        const storageAdapter = new OrbitDbStorage({
          orbitDbStorageConfig,
          ipfs,
        });

        await storageAdapter.initialize();
        await storageAdapter.isReady();

        const connectedPeers = await storageAdapter.ipfsNode.swarm.peers();
        expect(connectedPeers.length).toBeGreaterThan(0);
      },
      extendedJestTimeout
    );
  });

  describe('creating an orbit-db instance', () => {
    it(
      'can instantiate OrbitDb',
      async () => {
        expect.assertions(1);

        const ipfs = await create(
          createIpfsConfigOffline('ipfs-storage-adapter-02')
        );

        const storageAdapter = new OrbitDbStorage({
          ipfs,
          orbitDbStorageConfig,
        });
        await storageAdapter.initialize();

        expect(storageAdapter.orbitDb).toBeInstanceOf(OrbitDB);
      },
      extendedJestTimeout
    );

    it('fails to instantiate OrbitDb if initialize() is not awaited', async () => {
      expect.assertions(1);

      const ipfs = await create(
        createIpfsConfigOffline('ipfs-storage-adapter-03')
      );

      const storageAdapter = new OrbitDbStorage({
        ipfs,
        orbitDbStorageConfig,
      });

      expect(storageAdapter.orbitDb).toBeUndefined();
    });
  });

  describe('setting & getting values', () => {
    it('can register address', async () => {
      expect.assertions(2);
      const ipfs = await create(
        createIpfsConfigOffline('ipfs-storage-adapter-04')
      );
      const storageAdapter = new OrbitDbStorage({ ipfs, orbitDbStorageConfig });
      const accountAddress = 'minaAddress';

      await storageAdapter.initialize();
      await storageAdapter.registerAccount(accountAddress);

      const allAddresses = await storageAdapter.getAllRegisteredAccounts();
      expect(allAddresses).toEqual({ [`${accountAddress}`]: true });

      const value = await storageAdapter.getRegisteredAccount('minaAddress');
      expect(value).toEqual(true);
    });

    it('can set map', async () => {
      expect.assertions(1);
      const ipfs = await create(
        createIpfsConfigOffline('ipfs-storage-adapter-05')
      );
      const storageAdapter = new OrbitDbStorage({ ipfs, orbitDbStorageConfig });
      const accountAddress = 'minaAddress';
      const map = 'serializedMap';

      await storageAdapter.initialize();
      await storageAdapter.setMap(accountAddress, map);

      const mapFromStore = await storageAdapter.getMap('minaAddress');
      expect(mapFromStore).toEqual(map);
    });
  });
});

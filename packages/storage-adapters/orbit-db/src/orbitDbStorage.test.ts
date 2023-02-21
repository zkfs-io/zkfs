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
import type { PeersConfig } from './interface.js';

const extendedJestTimeout = 20_000;

// set false for CI testing
const quickTesting = false;

describe('orbitDbStorage', () => {
  const peersConfig: PeersConfig = {
    addresses: [],
    interval: 1000,
    timeout: 15_000,
  };

  beforeAll(async () => {
    const remoteIpfsNode = create(createIpfsConfigBase('ipfs-remote-node'));
    const remoteIpfsNodeId = (await (await remoteIpfsNode).id()).id.toString();
    peersConfig.addresses = [remoteIpfsNodeId];
  });

  afterAll(() => {
    if (quickTesting) tearDownIpfs();
  });

  it('can instantiate an OrbitDbStorage class', async () => {
    expect.assertions(1);

    const storageAdapter = new OrbitDbStorage({
      peersConfig: peersConfig,
      ipfs: {} as IPFS,
    });

    expect(storageAdapter).toBeInstanceOf(OrbitDbStorage);
  });

  describe('connecting to other peers', () => {
    it(
      'can connect to another IPFS node',
      async () => {
        expect.assertions(2);

        const ipfsForStorageAdapter = await create(
          createIpfsConfigConnectingToPeers(
            'ipfs-storage-adapter-01',
            peersConfig.addresses
          )
        );
        const storageAdapter = new OrbitDbStorage({
          peersConfig,
          ipfs: ipfsForStorageAdapter,
        });

        await storageAdapter.resolveWhenConnectedToPeers();

        const connectedPeers = await storageAdapter.ipfsNode.swarm.peers();
        expect(connectedPeers.length).toBeGreaterThan(0);

        const isConnected = await storageAdapter.isConnected();
        expect(isConnected).toBe(true);
      },
      extendedJestTimeout
    );
  });

  describe('creating an orbit-db instance', () => {
    it(
      'can instantiate OrbitDb',
      async () => {
        expect.assertions(1);

        const ipfsForStorageAdapter = await create(
          createIpfsConfigOffline('ipfs-storage-adapter-02')
        );

        const storageAdapter = new OrbitDbStorage({
          ipfs: ipfsForStorageAdapter,
          peersConfig,
        });
        await storageAdapter.isReady();

        expect(storageAdapter.orbitDb).toBeInstanceOf(OrbitDB);
      },
      extendedJestTimeout
    );

    it('fails to instantiate OrbitDb if isReady is not awaited', async () => {
      expect.assertions(1);

      const ipfsForStorageAdapter = await create(
        createIpfsConfigOffline('ipfs-storage-adapter-03')
      );

      const storageAdapter = new OrbitDbStorage({
        ipfs: ipfsForStorageAdapter,
        peersConfig,
      });

      expect(storageAdapter.orbitDb).toBeUndefined();
    });
  });

  describe.skip('setting values in orbit-db', () => {
    it('can set a map in orbit-db', async () => {
      const ipfsForStorageAdapter = await create(
        createIpfsConfigOffline('ipfs-storage-adapter-04')
      );

      const storageAdapter = new OrbitDbStorage({
        ipfs: ipfsForStorageAdapter,
        peersConfig,
      });

      const cid = await storageAdapter.setMap('account-address', 'map');
    });
  });
});

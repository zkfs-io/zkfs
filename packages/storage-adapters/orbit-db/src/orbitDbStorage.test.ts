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

  it('can instantiate an OrbitDbStorage class', () => {
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

        const ipfs = await create(
          createIpfsConfigConnectingToPeers(
            'ipfs-storage-adapter-01',
            peersConfig.addresses
          )
        );
        const storageAdapter = new OrbitDbStorage({
          peersConfig,
          ipfs,
        });

        await storageAdapter.initialize();
        await storageAdapter.isReady();

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

        const ipfs = await create(
          createIpfsConfigOffline('ipfs-storage-adapter-02')
        );

        const storageAdapter = new OrbitDbStorage({
          ipfs,
          peersConfig,
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
        peersConfig,
      });

      expect(storageAdapter.orbitDb).toBeUndefined();
    });
  });
});

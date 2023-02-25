/* eslint-disable unicorn/prevent-abbreviations */
/* eslint-disable max-statements */
import {
  OrbitDbStoragePartial,
  OrbitDbStorageLight,
} from '@zkfs/storage-orbit-db';
import { create as createIpfs } from 'ipfs-core';
import { OrbitDbDataPubSub } from '@zkfs/orbit-db-data-pubsub';

import {
  createIpfsConfigEmptyBootstrap,
  createIpfsConfigWithBootstrap,
} from '../test/configs.js';

import ZkfsNode from './zkfsNode.js';
import type { ZkfsNodeConfig } from './interface.js';

describe('zkfsNode', () => {
  it('can set data on server database and get it on light client', async () => {
    expect.assertions(3);

    // setup zkfs partial node
    const ipfsServer = await createIpfs(
      createIpfsConfigEmptyBootstrap('ipfs-partial-node')
    );
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, unicorn/no-await-expression-member
    const ipfsServerId = (await ipfsServer.id()).id.toString();
    const storageServer = new OrbitDbStoragePartial({
      ipfs: ipfsServer,
      addresses: ['mina1', 'mina2', 'zkAppAddress'],
      bootstrap: { interval: 1000, timeout: 15_000 },
    });
    const orbitDbDataPubSub = new OrbitDbDataPubSub();
    const zkfsNodePartialConfig: ZkfsNodeConfig = {
      storage: storageServer,
      services: [orbitDbDataPubSub],
    };
    const serverNode = new ZkfsNode(zkfsNodePartialConfig);
    await serverNode.start();

    // for 3 addresses, there are 6 open stores (map+value)
    expect(Object.keys(storageServer.storeInstances).length).toBe(6);

    // populate with data for testing
    const serializedMap = 'serializedMap';
    await serverNode.storage.setMap('zkAppAddress', serializedMap);

    const mapFromPeer = await serverNode.storage.getMap('zkAppAddress');

    expect(mapFromPeer).toStrictEqual(serializedMap);

    const ipfsClient = await createIpfs(
      createIpfsConfigWithBootstrap('ipfs-light-client', [ipfsServerId])
    );
    const storageClient = new OrbitDbStorageLight({
      ipfs: ipfsClient,
      bootstrap: { interval: 1000, timeout: 15_000 },
      pubsub: { timeout: 10_000 },
    });
    const zkfsNodeLightClientConfig: ZkfsNodeConfig = {
      storage: storageClient,
    };
    const clientNode = new ZkfsNode(zkfsNodeLightClientConfig);
    await clientNode.start();

    const serializedMapFromClient = await clientNode.storage.getMap(
      'zkAppAddress'
    );

    expect(serializedMapFromClient).toStrictEqual(serializedMap);
  }, 20_000);
});

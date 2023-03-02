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
import type { ZkfsNodeConfig, ValueRecord } from './interface.js';

describe('zkfsNode', () => {
  it('can set data on server database and get it on light client', async () => {
    expect.assertions(8);

    // setup zkfs partial node
    const ipfsServer = await createIpfs(
      createIpfsConfigEmptyBootstrap('ipfs-partial-node')
    );
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, unicorn/no-await-expression-member
    const ipfsServerId = (await ipfsServer.id()).id.toString();
    const storagePartial = new OrbitDbStoragePartial({
      ipfs: ipfsServer,
      addresses: ['mina1', 'mina2', 'zkAppAddress'],
      bootstrap: { interval: 1000, timeout: 15_000 },
    });
    const orbitDbDataPubSub = new OrbitDbDataPubSub();
    const zkfsNodePartialConfig: ZkfsNodeConfig<OrbitDbStoragePartial> = {
      storage: storagePartial,
      services: [orbitDbDataPubSub],
    };
    const peerNode = ZkfsNode.withPartialStorage(zkfsNodePartialConfig);
    await peerNode.start();

    // for 3 addresses, there are 6 open stores (map+value)
    expect(Object.keys(storagePartial.storeInstances).length).toBe(6);

    // populate with data for testing
    const serializedMap = 'serializedMap';
    await peerNode.storage.setMap('zkAppAddress', serializedMap);

    const mapFromPeer = await peerNode.storage.getMap('zkAppAddress');

    expect(mapFromPeer).toStrictEqual(serializedMap);

    const undefinedMap = await peerNode.storage.getMap('unknownAddress');
    expect(undefinedMap).toBeUndefined();

    const ipfsClient = await createIpfs(
      createIpfsConfigWithBootstrap('ipfs-light-client', [ipfsServerId])
    );
    const storageLightClient = new OrbitDbStorageLight({
      ipfs: ipfsClient,
      bootstrap: { interval: 1000, timeout: 15_000 },
      pubsub: { timeout: 10_000 },
    });
    const zkfsNodeLightClientConfig: ZkfsNodeConfig<OrbitDbStorageLight> = {
      storage: storageLightClient,
    };
    const lightClientNode = ZkfsNode.withLightClient(
      zkfsNodeLightClientConfig
    );
    await lightClientNode.start();

    const serializedMapFromClient = await lightClientNode.storage.getMap(
      'zkAppAddress'
    );

    expect(serializedMapFromClient).toStrictEqual(serializedMap);

    const undefinedValueRecord = await peerNode.storage.getValues(
      'unknownAccount',
      ['valueHash']
    );
    expect(undefinedValueRecord).toBeUndefined();

    const valueRecord1: ValueRecord = { [`valueHash`]: ['value1', 'value2'] };
    await peerNode.storage.setValue('mina1', valueRecord1);

    const valuesFromPeer = await peerNode.storage.getValues('mina1', [
      'valueHash',
    ]);

    expect(valuesFromPeer).toStrictEqual(valueRecord1);

    const incompleteValuesFromPeer = await peerNode.storage.getValues('mina1', [
      'valueHash',
      'unknownValueHash',
    ]);
    expect(Object.keys(incompleteValuesFromPeer!).length).toBe(1);

    const valueRecord2: ValueRecord = { [`valueHash2`]: ['value1', 'value2'] };
    await peerNode.storage.setValue('mina1', valueRecord2);

    const valueRecordFromClient = await lightClientNode.storage.getValues(
      'mina1',
      ['valueHash', 'valueHash2']
    );

    expect(valueRecordFromClient).toStrictEqual({
      ...valueRecord1,
      ...valueRecord2,
    });
  }, 20_000);
});

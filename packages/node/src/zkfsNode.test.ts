/* eslint-disable unicorn/prevent-abbreviations */
/* eslint-disable max-statements */
import {
  OrbitDbStoragePartial,
  OrbitDbStorageLight,
} from '@zkfs/storage-orbit-db';
import { create as createIpfs } from 'ipfs-core';
import { OrbitDbDataPubSub } from '@zkfs/orbit-db-data-pubsub';
import { VirtualStorage } from '@zkfs/virtual-storage';
import { EventParser } from '@zkfs/event-parser';

import { Mina } from 'snarkyjs';
import {
  createIpfsConfigEmptyBootstrap,
  createIpfsConfigWithBootstrap,
} from '../test/configs.js';

import { piggyBankTestData } from '../test/testData.js';
import ZkfsNode from './zkfsNode.js';
import type { ZkfsNodeConfig, ZkfsWriterNodeConfig } from './interface.js';


describe('zkfsNode', () => {
  it('can set data on server database and get it on light client', async () => {
    expect.assertions(0);

    // setup zkfs partial node
    const ipfsServer = await createIpfs(
      createIpfsConfigEmptyBootstrap('ipfs-partial-node')
    );
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, unicorn/no-await-expression-member
    const virtualStorage = new VirtualStorage();
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment
    const { id } = await ipfsServer.id();
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const ipfsServerId = id.toString();
    const storagePartial = new OrbitDbStoragePartial({
      ipfs: ipfsServer,
      addresses: ['B62qiyp9W7f4j9gf1Y5zrKGGxih9KwMb1mtpFsUb1QRPBfkKQ17SPAY'],
      bootstrap: { interval: 1000, timeout: 15_000 },
      virtualStorage,
    });
    const orbitDbDataPubSub = new OrbitDbDataPubSub();
    const mockMina = {
      fetchEvents: () => piggyBankTestData.events,
    } as unknown as typeof Mina;
    const eventParser = new EventParser(mockMina, { isLocalTesting: true });
    const zkfsNodePartialConfig: ZkfsWriterNodeConfig<OrbitDbStoragePartial> = {
      // eslint-disable-next-line putout/putout
      storage: storagePartial,
      services: [orbitDbDataPubSub],

      // @ts-expect-error todo: fix generics on services
      eventParser,
    };
    const peerNode = ZkfsNode.withPartialStorage(zkfsNodePartialConfig);
    await peerNode.start();

    // for 3 addresses, there are 6 open stores (map+value)
    //expect(Object.keys(storagePartial.storeInstances).length).toBe(6);

    // populate with data for testing

    // const mapFromPeer = await peerNode.storage.getMap('zkAppAddress');

    // expect(mapFromPeer).toStrictEqual(serializedMap);

    // const undefinedMap = await peerNode.storage.getMap('unknownAddress');
    // expect(undefinedMap).toBeUndefined();

    const ipfsClient = await createIpfs(
      createIpfsConfigWithBootstrap('ipfs-light-client', [ipfsServerId])
    );
    const virtualStorageLightClient = new VirtualStorage();
    const storageLightClient = new OrbitDbStorageLight({
      // eslint-disable-next-line putout/putout
      ipfs: ipfsClient,
      bootstrap: { interval: 1000, timeout: 15_000 },
      pubsub: { timeout: 10_000 },
      virtualStorage: virtualStorageLightClient,
    });
    const zkfsNodeLightClientConfig: ZkfsNodeConfig<OrbitDbStorageLight> = {
      // eslint-disable-next-line putout/putout
      storage: storageLightClient,
    };
    const lightClientNode = ZkfsNode.withLightClient(zkfsNodeLightClientConfig);
    await lightClientNode.start();

    await peerNode.eventParser?.fetchLocalEvents();
    console.log(await peerNode.storage.getWitness(
      'B62qiyp9W7f4j9gf1Y5zrKGGxih9KwMb1mtpFsUb1QRPBfkKQ17SPAY',
      '7784303761164632772807954006177484755146200365757401756120767318151927507806',
      '2879140883079234083739072433302655428620676912090406234791507627086874611706'
    ));

    // const serializedMapFromClient = await lightClientNode.storage.getMap(
    //   'zkAppAddress'
    // );

    // expect(serializedMapFromClient).toStrictEqual(serializedMap);

    // const undefinedValueRecord = await peerNode.storage.getValues(
    //   'unknownAccount',
    //   ['valueHash']
    // );
    // expect(undefinedValueRecord).toBeUndefined();

    // const valueRecord1: ValueRecord = { [`valueHash`]: ['value1', 'value2'] };
    // await peerNode.storage.setValue('mina1', valueRecord1);

    // const valuesFromPeer = await peerNode.storage.getValues('mina1', [
    //   'valueHash',
    // ]);

    // expect(valuesFromPeer).toStrictEqual(valueRecord1);

    // const incompleteValuesFromPeer = await peerNode.storage.getValues('mina1', [
    //   'valueHash',
    //   'unknownValueHash',
    // ]);
    // expect(Object.keys(incompleteValuesFromPeer!).length).toBe(1);

    // const valueRecord2: ValueRecord = { [`valueHash2`]: ['value1', 'value2'] };
    // await peerNode.storage.setValue('mina1', valueRecord2);

    // const valueRecordFromClient = await lightClientNode.storage.getValues(
    //   'mina1',
    //   ['valueHash', 'valueHash2']
    // );

    // expect(valueRecordFromClient).toStrictEqual({
    //   ...valueRecord1,
    //   ...valueRecord2,
    // });
  }, 20_000);
});

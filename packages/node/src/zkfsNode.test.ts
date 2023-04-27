/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
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
    expect.assertions(1);

    const account = 'B62qiyp9W7f4j9gf1Y5zrKGGxih9KwMb1mtpFsUb1QRPBfkKQ17SPAY';

    // setup zkfs partial node
    const ipfsServer = await createIpfs(
      createIpfsConfigEmptyBootstrap('ipfs-partial-node')
    );

    const virtualStorage = new VirtualStorage();

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { id } = await ipfsServer.id();
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const ipfsServerId = id.toString();
    const storagePartial = new OrbitDbStoragePartial({
      ipfs: ipfsServer,
      addresses: [account],
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
    // console.log(await peerNode.storage.getWitness(
    //   'B62qiyp9W7f4j9gf1Y5zrKGGxih9KwMb1mtpFsUb1QRPBfkKQ17SPAY',
    //   '7784303761164632772807954006177484755146200365757401756120767318151927507806',
    //   '2879140883079234083739072433302655428620676912090406234791507627086874611706'
    // ));

    const mapName = piggyBankTestData.maps.depositsMap.name;
    const key =
      '2879140883079234083739072433302655428620676912090406234791507627086874611706';
    const combinedKey = virtualStorage.getCombinedKey(mapName, key);

    const serializedWitness = await lightClientNode.storage.getWitness(
      account,
      mapName,
      key
    );

    const valueRecord = await lightClientNode.storage.getValues(account, [
      combinedKey,
    ]);

    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    const computedRoot = virtualStorage.computeRootFromSerializedValueWitness(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      serializedWitness!,
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      valueRecord![combinedKey]
    );

    expect(computedRoot).toStrictEqual(piggyBankTestData.maps.depositsMap.hash);
  }, 20_000);
});

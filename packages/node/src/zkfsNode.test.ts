/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable unicorn/prevent-abbreviations */
import {
  OrbitDbStoragePartial,
  OrbitDbStorageLight,
} from '@zkfs/storage-orbit-db';
import { create as createIpfs } from 'ipfs-core';
import { OrbitDbDataPubSub } from '@zkfs/orbit-db-data-pubsub';
import { VirtualStorage } from '@zkfs/virtual-storage';
import { EventParser } from '@zkfs/event-parser';
import type { Mina } from 'snarkyjs';

import {
  createIpfsConfigEmptyBootstrap,
  createIpfsConfigWithBootstrap,
} from '../test/configs.js';
import { piggyBankTestData } from '../test/testData.js';

import ZkfsNode from './zkfsNode.js';
import type { ZkfsNodeConfig, ZkfsWriterNodeConfig } from './interface.js';

const account = 'B62qiyp9W7f4j9gf1Y5zrKGGxih9KwMb1mtpFsUb1QRPBfkKQ17SPAY';

async function setupPartialNode() {
  const ipfs = await createIpfs(
    createIpfsConfigEmptyBootstrap('ipfs-partial-node')
  );

  const virtualStorage = new VirtualStorage();
  const { id } = await ipfs.id();

  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const ipfsServerId = id.toString();
  const storage = new OrbitDbStoragePartial({
    ipfs,
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
    storage,
    services: [orbitDbDataPubSub],
    eventParser,
  };

  const peerNode = ZkfsNode.withPartialStorage(zkfsNodePartialConfig);
  await peerNode.start();

  return { ipfsServerId, peerNode };
}

async function setupLightClientNode(ipfsServerId: string) {
  const ipfs = await createIpfs(
    createIpfsConfigWithBootstrap('ipfs-light-client', [ipfsServerId])
  );
  const virtualStorage = new VirtualStorage();
  const storage = new OrbitDbStorageLight({
    ipfs,
    bootstrap: { interval: 1000, timeout: 15_000 },
    pubsub: { timeout: 10_000 },
    virtualStorage,
  });

  const zkfsNodeLightClientConfig: ZkfsNodeConfig<OrbitDbStorageLight> = {
    storage,
  };
  const lightClientNode = ZkfsNode.withLightClient(zkfsNodeLightClientConfig);

  await lightClientNode.start();
  return lightClientNode;
}

function getTestDataKeys() {
  const mapName = piggyBankTestData.maps.depositsMap.name;
  const key =
    '2879140883079234083739072433302655428620676912090406234791507627086874611706';

  const virtualStorage = new VirtualStorage();
  const combinedKey = virtualStorage.getCombinedKey(mapName, key);

  return { mapName, key, combinedKey };
}

describe('zkfsNode', () => {
  describe('writer node and light client', () => {
    it('can write from events to partial node and respond to light client requests', async () => {
      expect.assertions(1);

      const { ipfsServerId, peerNode } = await setupPartialNode();
      const lightClientNode = await setupLightClientNode(ipfsServerId);

      // eslint-disable-next-line putout/putout
      await peerNode.eventParser?.fetchLocalEvents();

      const { mapName, key, combinedKey } = getTestDataKeys();

      const serializedWitness = await lightClientNode.storage.getWitness(
        account,
        mapName,
        key
      );
      const valueRecord = await lightClientNode.storage.getValues(account, [
        combinedKey,
      ]);

      const computedRoot = VirtualStorage.computeRootFromSerializedValueWitness(
        serializedWitness!,
        valueRecord![combinedKey]
      );

      expect(computedRoot).toStrictEqual(
        piggyBankTestData.maps.depositsMap.hash
      );
    }, 40_000);
  });
});

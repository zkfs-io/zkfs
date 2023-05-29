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
import { Consensus } from '@zkfs/consensus-bridge';
// eslint-disable-next-line @typescript-eslint/no-shadow
import { jest } from '@jest/globals';

import {
  createIpfsConfigEmptyBootstrap,
  createIpfsConfigWithBootstrap,
} from '../test/configs.js';
import { piggyBankTestData } from '../test/testData.js';

import ZkfsNode from './zkfsNode.js';
import type { ZkfsNodeConfig, ZkfsWriterNodeConfig } from './interface.js';

const account = 'B62qiyp9W7f4j9gf1Y5zrKGGxih9KwMb1mtpFsUb1QRPBfkKQ17SPAY';

// eslint-disable-next-line max-statements
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

  const mockFunction = jest.fn();

  // eslint-disable-next-line id-length, no-plusplus
  for (let i = 0; i < piggyBankTestData.offchainStateRootHashes.length; i++) {
    mockFunction.mockImplementationOnce(() => ({
      zkapp: { appState: [piggyBankTestData.offchainStateRootHashes.at(i)] },
    }));
  }

  const mockMina = {
    fetchEvents: () => piggyBankTestData.events,
    getAccount: () => mockFunction(),
  } as unknown as typeof Mina;

  const consensus = new Consensus(mockMina);

  const orbitDbDataPubSub = new OrbitDbDataPubSub();

  const eventParser = new EventParser(mockMina, { isLocalTesting: true });

  const zkfsNodePartialConfig: ZkfsWriterNodeConfig<OrbitDbStoragePartial> = {
    consensus,
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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const virtualStorage = new VirtualStorage({ useCachedWitnesses: true });
  const storage = new OrbitDbStorageLight({
    ipfs,
    bootstrap: { interval: 1000, timeout: 15_000 },
    pubsub: { timeout: 10_000 },
    virtualStorage,
  });

  const mockMina = {
    getAccount: () => ({
      zkapp: { appState: [piggyBankTestData.offchainStateRootHashes.at(-1)] },
    }),
  } as unknown as typeof Mina;
  const consensus = new Consensus(mockMina);

  const zkfsNodeLightClientConfig: ZkfsNodeConfig<OrbitDbStorageLight> = {
    consensus,
    storage,
  };
  const lightClientNode = ZkfsNode.withLightClient(zkfsNodeLightClientConfig);

  await lightClientNode.start();
  return lightClientNode;
}

function getPiggyBankKeys() {
  const mapName = piggyBankTestData.maps.depositsMap.name;
  const key =
    '18932931052585860264259247032555522188856103737430924825470907389007628214933';

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

      const { mapName, key, combinedKey } = getPiggyBankKeys();

      // eslint-disable-next-line max-len
      // essential to obtain the root map witness for the light client to perform accessController validation
      await lightClientNode.storage.getWitness(
        account,
        piggyBankTestData.maps.rootMap.name,
        mapName
      );

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
    }, 50_000);
  });
});

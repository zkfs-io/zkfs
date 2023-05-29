/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable unicorn/prevent-abbreviations */
import { OrbitDbStoragePartial } from '@zkfs/storage-orbit-db';
import { create as createIpfs } from 'ipfs-core';
import { OrbitDbDataPubSub } from '@zkfs/orbit-db-data-pubsub';
import { ZkfsNode, type ZkfsNodeConfig } from '@zkfs/node';
import { VirtualStorage } from '@zkfs/virtual-storage';
import { Consensus } from '@zkfs/consensus-bridge';
import { EventParser } from '@zkfs/event-parser';
import type { Mina } from 'snarkyjs';

import { defaultStorageOptions, ipfsPeerNodeConfig } from './config.js';

async function setupPartialNode(
  address: string,
  mina: typeof Mina
): Promise<{ id: string; zkfsNode: ZkfsNode<OrbitDbStoragePartial> }> {
  const consensus = new Consensus(mina);

  const ipfsConfig = ipfsPeerNodeConfig(`ipfs-partial-node`);
  const ipfs = await createIpfs(ipfsConfig);
  const virtualStorage = new VirtualStorage();
  const storage = new OrbitDbStoragePartial({
    ipfs,
    addresses: [address],
    virtualStorage,
    ...defaultStorageOptions,
  });

  const orbitDbDataPubSub = new OrbitDbDataPubSub();

  const eventParser = new EventParser(mina, { isLocalTesting: true });

  const zkfsNodePartialConfig: ZkfsNodeConfig<OrbitDbStoragePartial> = {
    consensus,
    storage,
    services: [orbitDbDataPubSub],
    eventParser,
  };

  const zkfsNode = new ZkfsNode<OrbitDbStoragePartial>(zkfsNodePartialConfig);

  await zkfsNode.start();

  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, unicorn/no-await-expression-member
  const id = (await ipfs.id()).id.toString() as unknown as string;
  return { id, zkfsNode };
}

export default setupPartialNode;

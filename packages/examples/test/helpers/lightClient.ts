/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { type ZkfsNodeConfig, ZkfsNode } from '@zkfs/node';
import { OrbitDbStorageLight } from '@zkfs/storage-orbit-db';
import { create as createIpfs } from 'ipfs-core';
import { VirtualStorage } from '@zkfs/virtual-storage';
import { Consensus } from '@zkfs/consensus-bridge';
import type { Mina } from 'snarkyjs';

import { ipfsLightClientConfig, defaultStorageOptions } from './config.js';

async function setupLightClient(
  peerNodeId: string,
  mina: typeof Mina
): Promise<ZkfsNode<OrbitDbStorageLight>> {
  const ipfsConfig = ipfsLightClientConfig(`ipfs-light-client`, peerNodeId);
  const ipfs = await createIpfs(ipfsConfig);
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const virtualStorage = new VirtualStorage({ useCachedWitnesses: true });

  const storage = new OrbitDbStorageLight({
    ipfs,
    virtualStorage,
    ...defaultStorageOptions,
  });

  const consensus = new Consensus(mina);

  const zkfsNodeLightClientConfig: ZkfsNodeConfig<OrbitDbStorageLight> = {
    consensus,
    storage,
  };
  const lightClientNode = ZkfsNode.withLightClient(zkfsNodeLightClientConfig);

  await lightClientNode.start();

  return lightClientNode;
}

export default setupLightClient;

/* eslint-disable import/no-unused-modules */
import type { ZkfsNodeConfig } from '@zkfs/node';
import { OrbitDbStorageLight } from '@zkfs/storage-orbit-db';
import { create as createIpfs } from 'ipfs-core';
import { VirtualStorage } from '@zkfs/virtual-storage';

import { ipfsLightClientConfig, defaultStorageOptions } from './config.js';

async function createLightClientConfig(
  peerNodeId: string
): Promise<ZkfsNodeConfig<OrbitDbStorageLight>> {
  const id = Math.floor(Math.random() * 10_000);
  const ipfsConfig = ipfsLightClientConfig(
    `ipfs-light-client-${id}`,
    peerNodeId
  );
  const ipfs = await createIpfs(ipfsConfig);
  const virtualStorage = new VirtualStorage();

  const storage = new OrbitDbStorageLight({
    ipfs,
    virtualStorage,
    ...defaultStorageOptions,
  });

  return {
    storage,
  };
}

export default createLightClientConfig;

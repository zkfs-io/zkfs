import { ZkfsNodeConfig } from '@zkfs/node';
import { OrbitDbStorageLight } from '@zkfs/storage-orbit-db';
import { create as createIpfs } from 'ipfs-core';

import { ipfsLightClientConfig, defaultStorageOptions } from './config.js';

async function createLightClientConfig(
  peerNodeId: string
): Promise<ZkfsNodeConfig> {
  const ipfsConfig = ipfsLightClientConfig('ipfs-light-client', peerNodeId);
  const ipfs = await createIpfs(ipfsConfig);

  const storage = new OrbitDbStorageLight({
    ipfs,
    ...defaultStorageOptions,
  });

  return {
    storage,
  };
}

export default createLightClientConfig;

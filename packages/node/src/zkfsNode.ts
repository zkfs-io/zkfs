/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import {
  OrbitDbStorageLight,
  OrbitDbStoragePartial,
} from '@zkfs/storage-orbit-db';

import type { ZkfsNodeConfig, Service, StorageAdapter } from './interface.js';

class ZkfsNode<Storage extends StorageAdapter> implements ZkfsNode<Storage> {
  public static withPartialStorage(
    config: ZkfsNodeConfig<OrbitDbStoragePartial>
  ) {
    return new ZkfsNode<OrbitDbStoragePartial>(config);
  }

  public static withLightClient(config: ZkfsNodeConfig<OrbitDbStorageLight>) {
    return new ZkfsNode<OrbitDbStorageLight>(config);
  }

  public storage: Storage;

  public services: Service[];

  public constructor(config: ZkfsNodeConfig<Storage>) {
    this.storage = config.storage;
    this.services = config.services ?? [];
  }

  public async start() {
    await this.storage.isReady();
    await this.storage.initialize();
    Promise.all(
      this.services.map(async (service) => {
        await service.initialize(this);
      })
      // eslint-disable-next-line promise/prefer-await-to-then
    ).catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error(error);
    });
  }
}

export default ZkfsNode;

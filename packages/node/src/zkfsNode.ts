/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import type { ZkfsNodeConfig, Service, StorageAdapter } from './interface.js';

class ZkfsNode implements ZkfsNode {
  public storage: StorageAdapter;

  public services: Service[];

  public constructor(config: ZkfsNodeConfig) {
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

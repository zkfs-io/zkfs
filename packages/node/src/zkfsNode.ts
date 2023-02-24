import type { StorageAdapter } from '@zkfs/storage-orbit-db/dist/interface.js';

import type { ZkfsNodeConfig, Service } from './interface.js';

class ZkfsNode implements ZkfsNode {
  public storage: StorageAdapter;

  public services: Service[];

  public constructor(config: Readonly<ZkfsNodeConfig>) {
    this.storage = config.storage;
    this.services = config.services ?? [];
  }

  public async start() {
    await this.storage.isReady();
    await this.storage.initialize();
    Promise.all(this.services.map((service) => service.initialize(this))).catch(
      (error) => console.log(error)
    );
  }
}

export default ZkfsNode;

/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import type {
  OrbitDbStorageLight,
  OrbitDbStoragePartial,
} from '@zkfs/storage-orbit-db';

import type {
  ZkfsNodeConfig,
  Service,
  StorageAdapter,
  EventParserAdapter,
  ZkfsWriterNodeConfig,
  ConsensusBridge,
} from './interface.js';

class ZkfsNode<Storage extends StorageAdapter> implements ZkfsNode<Storage> {
  public static withPartialStorage(
    config: ZkfsWriterNodeConfig<OrbitDbStoragePartial>
  ) {
    return new ZkfsNode<OrbitDbStoragePartial>(config);
  }

  public static withLightClient(config: ZkfsNodeConfig<OrbitDbStorageLight>) {
    return new ZkfsNode<OrbitDbStorageLight>(config);
  }

  public storage: Storage;

  public services: Service<Storage>[];

  public eventParser: EventParserAdapter<Storage> | undefined;

  public consensus: ConsensusBridge;

  public constructor(config: ZkfsNodeConfig<Storage>) {
    this.storage = config.storage;
    this.services = config.services ?? [];
    this.eventParser = config.eventParser;
    this.consensus = config.consensus;
  }

  public startServices() {
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

  public startEventParser() {
    if (this.eventParser) {
      // eslint-disable-next-line promise/prefer-await-to-then
      Promise.all([this.eventParser.initialize(this)]).catch(
        (error: unknown) => {
          // eslint-disable-next-line no-console
          console.error(error);
        }
      );
    }
  }

  public async start() {
    await this.storage.isReady();
    await this.storage.initialize(this.consensus);
    this.startServices();
    this.startEventParser();
  }
}

export default ZkfsNode;

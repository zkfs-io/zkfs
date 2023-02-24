import type { StorageAdapter } from '@zkfs/storage-orbit-db/dist/interface.js';

interface Service {
  initialize: (zkfsNode: ZkfsNode) => Promise<void>;
}

interface EventParserAdapter {}

interface ZkfsNodeConfig {
  storage: StorageAdapter;
  services?: Service[];
}

interface ZkfsNode<Storage = StorageAdapter> {
  storage: Storage;
  services?: Service[];
  eventParser?: EventParserAdapter;
}

export { Service, ZkfsNodeConfig, ZkfsNode };

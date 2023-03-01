import type {
  ZkfsNodeConfig,
  ZkfsNode as ZkfsNodeGeneric,
} from '@zkfs/node/dist/interface.js';
import { OrbitDbStoragePartial } from '@zkfs/storage-orbit-db';
import { create as createIpfs } from 'ipfs-core';
import { OrbitDbDataPubSub } from '@zkfs/orbit-db-data-pubsub';
import { ZkfsNode } from '@zkfs/node';
import { VirtualStorage } from '@zkfs/virtual-storage';
import { defaultStorageOptions, ipfsPeerNodeConfig } from './config.js';

class PeerNodeHelper {
  public zkfsNode: ZkfsNodeGeneric<OrbitDbStoragePartial>;

  /**
   * It creates an IPFS node, connects it to a partial storage,
   * and returns the IPFS node's ID
   *
   * @returns The peer id of the node.
   */
  public async setup(): Promise<string> {
    const ipfsConfig = ipfsPeerNodeConfig('ipfs-partial-node');
    const ipfs = await createIpfs(ipfsConfig);

    const storagePartial = new OrbitDbStoragePartial({
      ipfs,
      addresses: [],
      ...defaultStorageOptions,
    });

    const orbitDbDataPubSub = new OrbitDbDataPubSub();
    const zkfsNodePartialConfig: ZkfsNodeConfig = {
      storage: storagePartial,
      services: [orbitDbDataPubSub],
    };

    this.zkfsNode = new ZkfsNode(
      zkfsNodePartialConfig
    ) as unknown as ZkfsNodeGeneric<OrbitDbStoragePartial>;

    await this.zkfsNode.start();

    return (await ipfs.id()).id.toString();
  }

  /**
   * It creates a map store and a value store for the given account.
   *
   * @param {string} account - The account you want to watch.
   */
  public async watchAddress(account: string) {
    const mapStore = await this.zkfsNode.storage.createAndLoadMapStores([
      account,
    ]);
    this.zkfsNode.storage.saveStoreInstances(mapStore);

    const valueStore = await this.zkfsNode.storage.createAndLoadValueStores([
      account,
    ]);
    this.zkfsNode.storage.saveStoreInstances(valueStore);
  }

  /**
   * It writes the new map and values to the storage
   * This helper function replaces the event writer for testing purposes.
   *
   * @param {string} address - The address of the zkApp account
   * @param {VirtualStorage} virtualStorage - virtual storage object that
   * is created by the contract.
   */

  public async mockEventParser(
    address: string,
    virtualStorage: VirtualStorage
  ) {
    // write new map
    const serializedMap = virtualStorage.getSerializedMap(address);
    if (serializedMap !== undefined) {
      await this.zkfsNode.storage.setMap(address, serializedMap);
    }

    // write new values
    const data = virtualStorage.getSerializedData(address);
    await Promise.all(
      Object.entries(data).map(async ([key, value]) => {
        if (value !== undefined) {
          await this.zkfsNode.storage.setValue(address, {
            [String(key)]: value,
          });
        }
      })
    );
  }
}

export default PeerNodeHelper;

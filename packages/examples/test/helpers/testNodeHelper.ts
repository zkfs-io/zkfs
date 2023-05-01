/* eslint-disable import/no-unused-modules */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable unicorn/prevent-abbreviations */
import { OrbitDbStoragePartial } from '@zkfs/storage-orbit-db';
import { create as createIpfs } from 'ipfs-core';
import { OrbitDbDataPubSub } from '@zkfs/orbit-db-data-pubsub';
import { ZkfsNode, type ZkfsNodeConfig } from '@zkfs/node';
import { VirtualStorage } from '@zkfs/virtual-storage';

import { defaultStorageOptions, ipfsPeerNodeConfig } from './config.js';

class TestNodeHelper {
  /**
   * It creates an IPFS node, connects it to a partial storage,
   * and returns the IPFS node's ID
   *
   * @returns The peer id of the node.
   */
  public static async setup(): Promise<TestNodeHelper> {
    const ipfsConfigId = Math.floor(Math.random() * 10_000);
    const ipfsConfig = ipfsPeerNodeConfig(`ipfs-partial-node-${ipfsConfigId}`);
    const ipfs = await createIpfs(ipfsConfig);
    const virtualStorage = new VirtualStorage();

    const storage = new OrbitDbStoragePartial({
      ipfs,
      addresses: [],
      virtualStorage,
      ...defaultStorageOptions,
    });

    const orbitDbDataPubSub = new OrbitDbDataPubSub();
    const zkfsNodePartialConfig: ZkfsNodeConfig<OrbitDbStoragePartial> = {
      storage,
      services: [orbitDbDataPubSub],
    };

    const zkfsNode = new ZkfsNode<OrbitDbStoragePartial>(zkfsNodePartialConfig);

    await zkfsNode.start();
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, unicorn/no-await-expression-member, @typescript-eslint/consistent-type-assertions
    const id = (await ipfs.id()).id.toString() as unknown as string;
    return new TestNodeHelper(zkfsNode, id);
  }

  public constructor(
    public zkfsNode: ZkfsNode<OrbitDbStoragePartial>,
    public id: string
  ) {}

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
}

export default TestNodeHelper;

/* eslint-disable unicorn/prevent-abbreviations */
import { OrbitDbStoragePartial } from '@zkfs/storage-orbit-db';
import { create as createIpfs } from 'ipfs-core';
import { OrbitDbDataPubSub } from '@zkfs/orbit-db-data-pubsub';
import { ZkfsNode, type ZkfsNodeConfig } from '@zkfs/node';
import { VirtualStorage } from '@zkfs/virtual-storage';
import { Key } from '@zkfs/contract-api';
import { defaultStorageOptions, ipfsPeerNodeConfig } from './config.js';

const defaultRootMapName =
  '26066477330778984202216424320685767887570180679420406880153508397309006440830';

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

    const storagePartial = new OrbitDbStoragePartial({
      ipfs,
      addresses: [],
      ...defaultStorageOptions,
    });

    const orbitDbDataPubSub = new OrbitDbDataPubSub();
    const zkfsNodePartialConfig: ZkfsNodeConfig<OrbitDbStoragePartial> = {
      storage: storagePartial,
      // @ts-expect-error
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
    if (!this.zkfsNode) {
      throw new Error('ZkfsNode not configured');
    }
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
    virtualStorage: VirtualStorage,
    offchainState?: any
  ) {
    // const mapNamesToSet =
    //   offchainState?.maps?.map((mapName) => {
    //     return Key.fromString(mapName).toString();
    //   }) ?? [];

    // // save maps from virtual storage to offchain storage
    // await Promise.all(
    //   mapNamesToSet.map((mapName) => {
    //     if (mapName) {
    //       console.log('fetching from virtual storage', mapName);
    //       const map = virtualStorage.getSerializedMap(address, mapName);
    //       console.log(
    //         'testnode helper, virtual storage gave',
    //         map ? 'much data' : undefined
    //       );
    //       if (map) {
    //         console.log('testnodehelper sets map', mapName);
    //         return this.zkfsNode.storage.setMap(address, map, mapName);
    //       }
    //     }
    //     return [];
    //   })
    // );

    // // set values from virtual storage
    // if (offchainState?.keys?.length) {
    //   await Promise.all(
    //     offchainState.keys.map((combinedKey) => {
    //       const [mapName, key] = combinedKey.split('-');
    //       const value = virtualStorage.getSerializedValue(
    //         address,
    //         mapName,
    //         key
    //       );
    //       if (value) {
    //         const valueRecord = { [String(combinedKey)]: value };
    //         return this.zkfsNode.storage.setValue(address, valueRecord);
    //       }
    //     })
    //   );
    // }
  }
}

export default TestNodeHelper;
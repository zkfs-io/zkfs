/* eslint-disable max-statements */
import { Mina, type Proof, type ZkappPublicInput } from 'snarkyjs';
import { VirtualStorage } from '@zkfs/virtual-storage';
import type { ZkfsNode } from '@zkfs/node';
import type { OrbitDbStorageLight } from '@zkfs/storage-orbit-db';

import type OffchainStateContract from './offchainStateContract.js';
import { type OffchainStateKeys, getMapKeyData } from './fetchOffchainState.js';

// eslint-disable-next-line etc/no-deprecated
type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

/**
 * It provides a `transaction` method that wraps a callback
 * function in a Mina transaction
 */
class ContractApi {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public virtualStorage = new VirtualStorage({ useCachedWitnesses: true });

  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  public constructor(public node?: ZkfsNode<OrbitDbStorageLight>) {}

  /**
   * This function restores the latest offchain state of a contract.
   *
   * @param {OffchainStateContract} contract - The `contract` parameter is
   *  an instance of an `OffchainStateContract` class that needs to be restored
   *  to its latest off-chain state.
   */
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  public restoreLatest(contract: OffchainStateContract) {
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    Object.getPrototypeOf(
      contract
    ).constructor.offchainState.backup.restoreLatest(contract);
  }

  /**
   * It assigns the virtual storage of this contract to
   * the provided contract's virtual storage property
   *
   * @param {OffchainStateContract} contract
   * The contract object that is being called.
   */
  public async fetchOffchainState(
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    contract: OffchainStateContract,
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    offchainStateKeys?: OffchainStateKeys
  ) {
    // eslint-disable-next-line no-param-reassign
    contract.virtualStorage = this.virtualStorage;

    // skip if no offchain state keys for fetching were provided
    if (!offchainStateKeys) {
      return;
    }

    // light-client is necessary for fetching offchain state
    if (!this.node) {
      throw new Error(
        'Please configure ZKFS node as light client for contract API'
      );
    }

    const mapKeys = getMapKeyData(offchainStateKeys);

    const address = contract.address.toBase58();

    await Promise.all(
      mapKeys.map(async (mapKeyData) => {
        // fetch witnesses from ZKFS node
        // eslint-disable-next-line putout/putout
        const witness = await this.node?.storage.getWitness(
          address,
          mapKeyData.mapName,
          mapKeyData.key
        );
        if (witness === undefined) {
          return;
        }

        // save fetched witnesses to virtual storage
        this.virtualStorage.setSerializedWitness(
          mapKeyData.mapName,
          mapKeyData.key,
          witness
        );
      })
    );

    const valuesToFetch = mapKeys.filter((mapKeyData) => mapKeyData.isValue);
    const combinedKeysToFetch = valuesToFetch.map((mapKeyData) =>
      this.virtualStorage.getCombinedKey(mapKeyData.mapName, mapKeyData.key)
    );

    // fetch values from ZKFS node
    const values = await this.node.storage.getValues(
      address,
      combinedKeysToFetch
    );
    if (values === undefined) {
      return;
    }

    // save fetched values to virtual storage
    Object.entries(values).forEach(([combinedKey, value]) => {
      const [mapName, key] = combinedKey.split('-');
      this.virtualStorage.setSerializedValue(address, mapName, key, value);
    });
  }

  /**
   * It takes a contract, a sender, and a callback function, and then
   * it executes the callback function inside a transaction
   *
   * @param {OffchainStateContract} contract - OffchainStateContract
   * the contract that you want to use
   *
   * @param sender
   * The address of the account that will pay the transaction fee.
   *
   * @param transactionCallback
   * This is the function that will be executed inside the transaction.
   *
   * @returns A promise of a transaction.
   */
  // eslint-disable-next-line max-params
  public async transaction(
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    contract: OffchainStateContract,
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    sender: Mina.FeePayerSpec,
    transactionCallback: () => void,
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    data?: OffchainStateKeys
  ): Promise<Transaction> {
    await this.fetchOffchainState(contract, data);

    return await Mina.transaction(sender, () => {
      transactionCallback();
    });
  }

  /**
   * This function takes in a contract and a transaction callback, sets
   * a flag to indicate that the contract is being proven, executes the
   * transaction callback, and then sets the flag back to false.
   *
   * @param {OffchainStateContract} contract - OffchainStateContract
   * the contract that you want to use
   * @param transactionCallback
   * This function is called to generate a proof for transaction of a contract.
   *
   * @returns the result of the `transactionCallback` function, which is
   * expected to be a Promise that resolves to a Proof.
   */
  public async prove(
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    contract: OffchainStateContract,
    // eslint-disable-next-line putout/putout
    transactionCallback: () => Promise<(Proof<ZkappPublicInput> | undefined)[]>
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const offchainStateBackup =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      Object.getPrototypeOf(contract).constructor.offchainState.backup;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    offchainStateBackup.isProving = true;
    const proofedTransaction = await transactionCallback();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    offchainStateBackup.isProving = false;

    return proofedTransaction;
  }
}

export default ContractApi;

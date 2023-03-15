/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { type Field, Mina } from 'snarkyjs';
import { VirtualStorage } from '@zkfs/virtual-storage';

import type OffchainStateContract from './offchainStateContract.js';

// testing version bump

// eslint-disable-next-line etc/no-deprecated
type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

/**
 * It provides a `transaction` method that wraps a callback
 * function in a Mina transaction
 */
class ContractApi {
  public virtualStorage = new VirtualStorage();

  /**
   * It assigns the virtual storage of this contract to
   * the provided contract's virtual storage property
   *
   * @param {OffchainStateContract} contract
   * The contract object that is being called.
   */
  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types, @typescript-eslint/require-await
  public async fetchOffchainState(contract: OffchainStateContract) {
    // eslint-disable-next-line no-param-reassign
    contract.virtualStorage = this.virtualStorage;
    Object.getPrototypeOf(contract).constructor.virtualStorage =
      this.virtualStorage;
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
  public async transaction(
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    contract: OffchainStateContract,
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    sender: Mina.FeePayerSpec,
    transactionCallback: () => void
  ): Promise<Transaction> {
    await this.fetchOffchainState(contract);

    let iteration = 0;
    let virtualStorageBackup = {
      maps: JSON.stringify(this.virtualStorage.maps),
      data: JSON.stringify(this.virtualStorage.data),
    };
    // eslint-disable-next-line @typescript-eslint/init-declarations
    let offchainStateRootHashBackup: Field;

    const save = () => {
      virtualStorageBackup = {
        maps: JSON.stringify(this.virtualStorage.maps),
        data: JSON.stringify(this.virtualStorage.data),
      };
      try {
        offchainStateRootHashBackup = contract.offchainStateRootHash.get();
      } catch {
        /* empty */
      }
    };

    // eslint-disable-next-line max-statements
    const restore = () => {
      iteration += 1;

      // only restore the original storage once
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      if (iteration === 2) {
        return;
      }

      const maps = JSON.parse(virtualStorageBackup.maps);
      const data = JSON.parse(virtualStorageBackup.data);
      this.virtualStorage.maps = maps;
      this.virtualStorage.data = data;

      // eslint-disable-next-line no-param-reassign
      contract.virtualStorage = this.virtualStorage;
      Object.getPrototypeOf(contract).constructor.virtualStorage =
        this.virtualStorage;

      /**
       * Handling backup of the onchain state is necessary,
       * since calling .set within the same transaction does not actually
       * set & write the value, so its not accessible in subsequent .get()
       * callls on onchain @state()
       *
       * Therefore we manually setRootHash on the OffchainStateMapRoot,
       * which is responsible for keeping the rolling root's root hash.
       */
      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, @typescript-eslint/strict-boolean-expressions
      if (offchainStateRootHashBackup) {
        contract.root.setRootHash(offchainStateRootHashBackup);
      }

      // eslint-disable-next-line no-param-reassign
      contract.lastUpdatedOffchainState = {};
    };

    // eslint-disable-next-line require-atomic-updates, no-param-reassign
    contract.virtualStorage = this.virtualStorage;

    return await Mina.transaction(sender, () => {
      save();
      transactionCallback();
      restore();
    });
  }
}

export default ContractApi;

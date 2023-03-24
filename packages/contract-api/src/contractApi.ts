import { Mina } from 'snarkyjs';
import { VirtualStorage } from '@zkfs/virtual-storage';

import type OffchainStateContract from './offchainStateContract.js';

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

    return await Mina.transaction(sender, () => {
      transactionCallback();
    });
  }
}

export default ContractApi;

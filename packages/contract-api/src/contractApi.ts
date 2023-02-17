import { Mina } from 'snarkyjs';
import { VirtualStorage } from '@zkfs/virtual-storage';
import cloneDeep from 'lodash/cloneDeep.js';

import type OffchainStateContract from './offchainStateContract.js';

// testing version bump

// eslint-disable-next-line etc/no-deprecated
type Transaction = Awaited<ReturnType<typeof Mina.transaction>>;

class ContractApi {
  public virtualStorage = new VirtualStorage();

  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types, @typescript-eslint/require-await
  public async fetchOffchainState(contract: OffchainStateContract) {
    // eslint-disable-next-line no-param-reassign
    contract.virtualStorage = this.virtualStorage;
  }

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
    let virtualStorageBackup = cloneDeep(this.virtualStorage);
    const save = () => {
      virtualStorageBackup = cloneDeep(this.virtualStorage);
    };

    const restore = () => {
      iteration += 1;

      // only restore the original storage once
      // eslint-disable-next-line @typescript-eslint/no-magic-numbers
      if (iteration === 2) {
        return;
      }

      this.virtualStorage = virtualStorageBackup;
      // eslint-disable-next-line no-param-reassign
      contract.virtualStorage = this.virtualStorage;
    };

    return await Mina.transaction(sender, () => {
      save();
      transactionCallback();
      restore();
    });
  }
}

export default ContractApi;

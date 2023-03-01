/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { method, PublicKey, UInt64 } from 'snarkyjs';
import {
  offchainState,
  OffchainStateContract,
  OffchainState,
  OffchainStateMap,
  Key,
} from '@zkfs/contract-api';

class PiggyBank extends OffchainStateContract {
  @offchainState() public deposits = OffchainState.fromMap();

  public init() {
    super.init();
    this.deposits.setRootHash(OffchainStateMap.initialRootHash());
  }

  public getDepositKey(address: PublicKey): Key<PublicKey> {
    return Key.fromType<PublicKey>(PublicKey, address);
  }

  @method
  public initialDeposit(to: PublicKey, amount: UInt64) {
    const key = this.getDepositKey(to);

    // make sure there are no deposits for the 'to' address
    this.deposits.assertNotExists(key);

    // set the provided amount as the initial deposit
    this.deposits.set<PublicKey, UInt64>(UInt64, key, amount);
  }

  @method
  public deposit(to: PublicKey, amount: UInt64) {
    const key = this.getDepositKey(to);

    const [currentDepositAmount] = this.deposits.get<PublicKey, UInt64>(
      UInt64,
      key
    );

    // set the provided amount as the initial deposit
    this.deposits.set<PublicKey, UInt64>(
      UInt64,
      key,
      currentDepositAmount.add(amount)
    );
  }
}

export default PiggyBank;

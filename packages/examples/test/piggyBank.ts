/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { Circuit, method, Poseidon, PublicKey, UInt64 } from 'snarkyjs';
import {
  offchainState,
  OffchainStateContract,
  OffchainState,
  OffchainStateMap,
  Key,
  withOffchainState,
} from '@zkfs/contract-api';

class PiggyBank extends OffchainStateContract {
  @offchainState() public deposits = OffchainState.fromMap();

  @withOffchainState
  public init() {
    super.init();
    this.deposits.setRootHash(OffchainStateMap.initialRootHash());
    Circuit.log('userDeposits', this.userDeposits.getPath().toString());
  }

  /**
   * It takes a public key and returns a key that can be used
   * to retrieve the deposit of the public key
   *
   * @param {PublicKey} address - PublicKey
   * The public key of the account that you want to get the deposit key for.
   *
   * @returns A Key<PublicKey>
   */
  public getDepositKey(address: PublicKey): Key<PublicKey> {
    Circuit.log(
      'user key is',
      Key.fromType<PublicKey>(PublicKey, address).toString()
    );
    return Key.fromType<PublicKey>(PublicKey, address);
  }

  /**
   * Make sure there are no deposits for the 'to' address,
   * then set the provided amount as the initial deposit.
   *
   * @param {PublicKey} to - PublicKey
   * the public key of the account to deposit to
   *
   * @param {UInt64} amount - UInt64
   */
  @method
  @withOffchainState
  public initialDeposit(to: PublicKey, amount: UInt64) {
    const key = this.getDepositKey(to);

    // make sure there are no deposits for the 'to' address
    this.deposits.assertNotExists(key);

    // set the provided amount as the initial deposit
    this.deposits.set<PublicKey, UInt64>(UInt64, key, amount);
  }

  /**
   * The function takes a public key and an amount as input,
   * and adds the amount to the current deposit amount for the public key
   *
   * @param {PublicKey} to - PublicKey
   * The public key of the account to deposit to
   *
   * @param {UInt64} amount - UInt64
   * The amount of 'tokens' to deposit
   */
  @method
  @withOffchainState
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

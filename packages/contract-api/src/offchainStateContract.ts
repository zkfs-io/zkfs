/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
import { Field, SmartContract, State, state } from 'snarkyjs';

import OffchainStateMapRoot from './offchainStateMapRoot.js';
import OffchainStateBackup from './offchainStateBackup.js';

interface RollingStateOptions {
  shouldEmitEvents: boolean;
  shouldEmitPrecondition: boolean;
  shouldEmitAccountUpdates: boolean;
}

/**
 * It's a smart contract that stores a single field, `offchainStateRootHash`,
 * which is the root hash of the offchain storage state
 */
class OffchainStateContract extends SmartContract {
  public static offchainState = {
    backup: OffchainStateBackup,
  };

  /**
   * Merkle root hash of the offchain storage state
   */
  @state(Field) public offchainStateRootHash = State<Field>();

  /* Way to access the offchain root state. */
  public root: OffchainStateMapRoot = new OffchainStateMapRoot(this);

  public rollingStateOptions: RollingStateOptions = {
    shouldEmitAccountUpdates: true,
    shouldEmitPrecondition: true,
    shouldEmitEvents: true,
  };

  public get virtualStorage() {
    return OffchainStateContract.offchainState.backup.virtualStorage;
  }

  public set virtualStorage(value) {
    OffchainStateContract.offchainState.backup.virtualStorage = value;
  }

  public setRollingStateOptions(options: Partial<RollingStateOptions>) {
    this.rollingStateOptions = {
      ...this.rollingStateOptions,
      ...options,
    };
  }

  public enableRollingMode() {
    this.rollingStateOptions = {
      ...this.rollingStateOptions,
      shouldEmitPrecondition: false,
      shouldEmitAccountUpdates: false,
      shouldEmitEvents: true,
    };
  }

  public disableRollingMode() {
    this.rollingStateOptions = {
      ...this.rollingStateOptions,
      shouldEmitPrecondition: true,
      shouldEmitAccountUpdates: true,
      shouldEmitEvents: true,
    };
  }

  public withRollingState<CallbackReturn>(
    callback: () => CallbackReturn
  ): CallbackReturn {
    this.enableRollingMode();
    const result = callback();
    this.disableRollingMode();
    this.root.setOnChainRootHash();

    return result;
  }
}

export default OffchainStateContract;

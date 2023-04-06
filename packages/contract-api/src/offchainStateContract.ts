/* eslint-disable lines-around-comment */
/* eslint-disable sort-class-members/sort-class-members */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
import { Field, SmartContract, State, state } from 'snarkyjs';

import OffchainStateMapRoot from './offchainStateMapRoot.js';
import OffchainStateBackup from './offchainStateBackup.js';
import type OffchainState from './offchainState.js';

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

  public get lastUpdatedOffchainState() {
    return OffchainStateContract.offchainState.backup.lastUpdatedOffchainState;
  }

  public set lastUpdatedOffchainState(value) {
    OffchainStateContract.offchainState.backup.lastUpdatedOffchainState = value;
  }

  public resetLastUpdatedOffchainState() {
    this.lastUpdatedOffchainState = undefined;
  }

  public getLastUpdatedOffchainState(
    mapName: string
  ): OffchainState<unknown, unknown> | undefined {
    return this.lastUpdatedOffchainState?.[mapName];
  }

  public setLastUpdatedOffchainState(
    mapName: string,
    lastUpdatedOffchainState: OffchainState<unknown, unknown>
  ) {
    this.lastUpdatedOffchainState ??= {};
    this.lastUpdatedOffchainState[mapName] = lastUpdatedOffchainState;
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
    };
  }

  public disableRollingMode() {
    this.rollingStateOptions = {
      ...this.rollingStateOptions,
      shouldEmitPrecondition: true,
      shouldEmitAccountUpdates: true,
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

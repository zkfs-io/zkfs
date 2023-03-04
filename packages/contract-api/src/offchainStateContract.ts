/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */

import type { VirtualStorage } from '@zkfs/virtual-storage';
import { Field, SmartContract, State, state } from 'snarkyjs';

import OffchainStateMapRoot from './offchainStateMapRoot.js';

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
  /**
   * Merkle root hash of the offchain storage state
   */
  @state(Field) public offchainStateRootHash = State<Field>();

  public virtualStorage?: VirtualStorage;

  /* Way to access the offchain root state. */
  public root: OffchainStateMapRoot = new OffchainStateMapRoot(this);

  public rollingStateOptions: RollingStateOptions = {
    shouldEmitAccountUpdates: true,
    shouldEmitPrecondition: true,
    shouldEmitEvents: true,
  };

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
    const result = callback.bind(this)();
    this.disableRollingMode();
    this.root.setOnChainRootHash();

    return result;
  }

  /**
   * It returns an array of strings, which are the names of
   * the offchain state keys
   *
   * @returns An array of strings.
   */
  public analyzeOffchainStorage(): string[] {
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-member-access
    const thisConstructor = Object.getPrototypeOf(this)
      .constructor as OffchainStateContract;

    const offchainStateKeys: string[] =
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      (Reflect.getMetadata('zkfs:offchainStateKeys', thisConstructor) as
        | string[]
        | undefined) ?? [];

    return offchainStateKeys;
  }
}

export default OffchainStateContract;

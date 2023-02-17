/* eslint-disable new-cap */

import type { VirtualStorage } from '@zkfs/virtual-storage';
import { Field, method, SmartContract, State, state } from 'snarkyjs';

/**
 * Class with utilities for offchain storage usage
 */
class OffchainStateContract extends SmartContract {
  /**
   * Merkle root hash of the offchain storage state
   */
  @state(Field) public offchainStateRootHash = State<Field>();

  // define one 'mock' event, to force snarky
  // to add an event index to the emitted event
  public events = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'zkfs:init': Field,
  };

  public virtualStorage: VirtualStorage;

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

  @method
  public hydrateOffchainStateRootHash(
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    offchainStateRootHash: Field
  ) {
    this.offchainStateRootHash.set(offchainStateRootHash);
  }
}

export default OffchainStateContract;

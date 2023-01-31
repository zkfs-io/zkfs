/* eslint-disable new-cap */
import { Field, SmartContract, State, state } from 'snarkyjs';

/**
 * Class with utilities for offchain storage usage
 */
class OffchainStorageContract extends SmartContract {
  public static analyzeOffchainStorage(): string[] {
    const offchainStateKeys: string[] =
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      (Reflect.getMetadata('zkfs:offchainStateKeys', this) as
        | string[]
        | undefined) ?? [];

    return offchainStateKeys;
  }

  /**
   * Merkle root hash of the offchain storage state
   */
  @state(Field) public offchainStateRootHash = State<Field>();
}

export default OffchainStorageContract;

import { type Field, Circuit, MerkleMapWitness, Poseidon } from 'snarkyjs';

// eslint-disable-next-line import/no-relative-packages
import type { FlexibleProvablePure } from '../../../node_modules/snarkyjs/dist/node/lib/circuit_value.js';

import type OffchainStorageContract from './offchainStorageContract.js';

// utility function to cast Readonly<Value> to Value type
function asWritable<Value>(value: Readonly<Value>): Value {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return value as Value;
}

interface OffchainStateOptions {
  shouldAssertInTree?: boolean;
  shouldUpdateRootHash?: boolean;
}

class OffchainState<MapValue> {
  public static from<MapValue>(
    valueType: Readonly<FlexibleProvablePure<MapValue>>,
    options?: Readonly<OffchainStateOptions>
  ) {
    return new OffchainState(valueType, options);
  }

  public value: MapValue;

  public witness: MerkleMapWitness;

  public contract: OffchainStorageContract;

  public key: Readonly<Field>;

  public constructor(
    public valueType: Readonly<FlexibleProvablePure<MapValue>>,
    public options: OffchainStateOptions = {
      shouldAssertInTree: true,
      shouldUpdateRootHash: true,
    }
  ) {}

  /**
   * Converts the value `.toFields()` and hashes it,
   * in order to work with it within a merkle tree.
   *
   * @returns Hash of the offchain state value
   */
  public toTreeValueHash(): Field {
    const fields = this.valueType.toFields(this.value);
    return Poseidon.hash(fields);
  }

  /**
   * Creates a set of transaction preconditions verifying
   * that the current value + key belong in the desired tree
   */
  public assertInTree(offchainStateRootHash: Readonly<Field>): this {
    const valueHash = this.toTreeValueHash();
    const [stateRootHashFromValue, keyFromValue] =
      this.witness.computeRootAndKey(valueHash);

    // check if value + key combination exists in the desired tree
    this.key.assertEquals(keyFromValue);
    offchainStateRootHash.assertEquals(stateRootHashFromValue);

    return this;
  }

  public get(): this {
    // asWritable allows us to expose `valueType` as non-Readonly
    this.value = Circuit.witness<MapValue>(asWritable(this.valueType), () => {
      const [fields] = this.contract.virtualStorage.get(
        this.contract.address,
        this.key
      );

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return this.valueType.fromFields(fields) as MapValue;
    });

    this.witness = Circuit.witness<MerkleMapWitness>(MerkleMapWitness, () => {
      const [, witness] = this.contract.virtualStorage.get(
        this.contract.address,
        this.key
      );

      return witness;
    });

    if (this.options.shouldAssertInTree ?? false) {
      const offchainStateRootHash = this.contract.offchainStateRootHash.get();
      this.contract.offchainStateRootHash.assertEquals(offchainStateRootHash);
      this.assertInTree(offchainStateRootHash);
    }

    return this;
  }

  public set(value: MapValue): this {
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
    this.contract.emitEvent(this.key.toString() as any, value);

    // write the update to the virtual storage
    const fields = this.valueType.toFields(this.value);
    this.contract.virtualStorage.set(this.contract.address, this.key, fields);
    this.value = value;

    if (this.options.shouldUpdateRootHash ?? false) {
      const newOffchainStateRootHash = this.getRootHash();
      this.contract.offchainStateRootHash.set(newOffchainStateRootHash);
    }

    return this;
  }

  public getRootHash(): Field {
    const rootHash = this.contract.virtualStorage.getRoot(
      this.contract.address
    );

    if (!rootHash) {
      throw new Error('Root hash not found');
    }

    return rootHash;
  }
}

export default OffchainState;
export type { OffchainStateOptions };

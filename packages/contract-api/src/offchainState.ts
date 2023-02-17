import { type Field, Circuit, MerkleMapWitness, Poseidon } from 'snarkyjs';

// eslint-disable-next-line import/no-relative-packages
import type { FlexibleProvablePure } from '../../../node_modules/snarkyjs/dist/node/lib/circuit_value.js';

import type OffchainStateContract from './offchainStateContract.js';

// utility function to cast Readonly<Value> to Value type
function asWritable<Value>(value: Readonly<Value>): Value {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return value as Value;
}

/**
 * Options for the OffchainState class, allows adjusting
 * of the underlying OffchainState behavior such as when
 * to produce preconditions, or apply state assertions.
 */
interface OffchainStateOptions {
  shouldAssertInTree?: boolean;
  shouldUpdateRootHash?: boolean;
}

/**
 * Provides an API for the contracts to access off-chain state
 * seamlessly. Manages values, witnesses and preconditions related
 * to off-chain state.
 */
class OffchainState<MapValue> {
  public static from<MapValue>(
    valueType: Readonly<FlexibleProvablePure<MapValue>>,
    options?: Readonly<OffchainStateOptions>
  ) {
    return new OffchainState(valueType, options);
  }

  // current value of the OffchainState
  public value: MapValue;

  // current merkle witness for the current key
  public witness: MerkleMapWitness;

  // reference to the underlying contract, provides access to virtual storage
  public contract: OffchainStateContract;

  // key in the merkle map, that this state belongs to
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

  /**
   * Provides a circuit witness for the current value from the virtual storage
   * @returns this
   */
  public getValue(): this {
    this.value = Circuit.witness<MapValue>(asWritable(this.valueType), () => {
      const [fields] = this.contract.virtualStorage.get(
        this.contract.address,
        this.key
      );

      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      return this.valueType.fromFields(fields) as MapValue;
    });

    return this;
  }

  /**
   * Provides a circuit witness for the current merkle witness
   * from the virtual storage
   * @returns this
   */
  public getWitness(): this {
    this.witness = Circuit.witness<MerkleMapWitness>(MerkleMapWitness, () => {
      const [, witness] = this.contract.virtualStorage.get(
        this.contract.address,
        this.key
      );

      return witness;
    });

    return this;
  }

  /**
   * Provides circuit witnesses for both the value and merkle witness.
   * Optionally it checks if the provided value satisfies the on-chain
   * root hash commitment.
   *
   * @returns this
   */
  public get(): this {
    // asWritable allows us to expose `valueType` as non-Readonly
    this.getValue();
    this.getWitness();

    if (this.options.shouldAssertInTree ?? false) {
      this.assertInOnChainTree();
    }

    return this;
  }

  /**
   * Asserts that the current value/witness are part of the
   * on-chain `offchainStateRootHash` commitment.
   *
   * @returns this
   */
  public assertInOnChainTree(): this {
    const offchainStateRootHash = this.contract.offchainStateRootHash.get();
    this.contract.offchainStateRootHash.assertEquals(offchainStateRootHash);
    this.assertInTree(offchainStateRootHash);
    return this;
  }

  /**
   * Sets the `offchainStateRootHash` on-chain state
   *
   * @param rootHash Off-chain state root hash to be saved on-chain
   * @returns this
   */
  public updateOnChainRootHash(rootHash?: Readonly<Field>): this {
    const newOffchainStateRootHash = rootHash ?? this.getRootHash();
    this.contract.offchainStateRootHash.set(newOffchainStateRootHash);
    return this;
  }

  /**
   * Updates this.value and emits the field representation of it
   * as a write event. It saves the value into the virtual storage,
   * and updates the current witness to represent the updated value.
   * Optionally, it also sets the on-chain root hash using the new witness.
   *
   * @param value New MapValue to set
   * @returns this
   */
  public set(value: MapValue): this {
    this.value = value;
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-explicit-any
    this.contract.emitEvent(this.key.toString() as any, this.value);

    // write the update to the virtual storage
    const fields = this.valueType.toFields(this.value);
    this.contract.virtualStorage.set(this.contract.address, this.key, fields);
    this.getWitness();

    if (this.options.shouldUpdateRootHash ?? false) {
      this.updateOnChainRootHash();
    }

    return this;
  }

  /**
   * Computes a root hash from the current witness and value
   * @returns Field rootHash
   */
  public getRootHash(): Field {
    const [rootHash] = this.witness.computeRootAndKey(this.toTreeValueHash());
    return rootHash;
  }
}

export default OffchainState;
export type { OffchainStateOptions };

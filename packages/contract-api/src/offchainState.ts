/* eslint-disable new-cap */
// eslint-disable-next-line max-classes-per-file
import {
  Field,
  MerkleMap,
  Circuit,
  MerkleMapWitness,
  Poseidon,
  UInt64,
  PrivateKey,
  PublicKey,
  Struct,
} from 'snarkyjs';
import { type FlexibleProvable } from 'snarkyjs/dist/node/lib/circuit_value';

import type OffchainStorageContract from './offchainStorageContract';

class CounterOffchainStorage extends Struct({
  counter: UInt64,
  user: PublicKey,
}) {
  public doStuff() {
    return '';
  }
}

// utility function to cast Readonly<Value> to Value type
function asWritable<Value>(value: Readonly<Value>): Value {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return value as Value;
}

class OffchainState<MapValue> {
  public static from<MapValue>(
    valueType: Readonly<FlexibleProvable<MapValue>>
  ) {
    return new OffchainState(valueType);
  }

  public value: MapValue;

  public witness: MerkleMapWitness;

  public contract: OffchainStorageContract;

  public key: Readonly<Field>;

  public constructor(public valueType: Readonly<FlexibleProvable<MapValue>>) {}

  // mock storage adapter
  public getMap(): MerkleMap {
    const map: MerkleMap = new MerkleMap();
    const mockValue = 100;
    const value = Field(mockValue);
    map.set(Field(0), value);
    return map;
  }

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
  public assertInTree(): this {
    const valueHash = this.toTreeValueHash();
    const [stateRootHashFromValue, keyFromValue] =
      this.witness.computeRootAndKey(valueHash);

    // create transaction preconditions to verify belonging of received
    // value + key combination in the desired tree
    this.contract.offchainStateRootHash.assertEquals(stateRootHashFromValue);
    this.key.assertEquals(keyFromValue);

    return this;
  }

  public get(): this {
    // const testValue: MapValue = Field(0) as unknown as MapValue;
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const testValue = new CounterOffchainStorage({
      counter: UInt64.from(0),
      user: PrivateKey.random().toPublicKey(),
    }) as unknown as MapValue;

    // asWritable allows us to expose `valueType` as non-Readonly
    this.value = Circuit.witness<MapValue>(
      asWritable(this.valueType),
      () => testValue
    );

    this.witness = Circuit.witness<MerkleMapWitness>(MerkleMapWitness, () => {
      const map = this.getMap();
      return map.getWitness(this.key);
    });

    return this;
  }

  public set(): this {
    // impl soon
    return this;
  }
}

export default OffchainState;

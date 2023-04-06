/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
/* eslint-disable max-statements */
import {
  Field,
  MerkleMapWitness,
  Poseidon,
  Bool,
  Circuit,
  type FlexibleProvablePure,
} from 'snarkyjs';
import { mergeMerkleMapWitnesses } from '@zkfs/virtual-storage';

// this needs to be removed once https://github.com/o1-labs/snarkyjs/issues/777 is fixed
// eslint-disable-next-line import/no-relative-packages
import { Events } from '../../../node_modules/snarkyjs/dist/node/provable/transaction-leaves.js';

// eslint-disable-next-line import/no-cycle
import OffchainStateMap from './offchainStateMap.js';
import type Key from './key.js';
import type OffchainStateContract from './offchainStateContract.js';
import errors from './errors.js';
import type OffchainStateMapRoot from './offchainStateMapRoot.js';

interface SetOptions {
  shouldEmitEvent: boolean;
}

/* `OffchainState` is a class that represents a value in a map */
class OffchainState<KeyType, ValueType> {
  public static defaultSetOptions: SetOptions = {
    shouldEmitEvent: true,
  };

  /**
   * "Create a new OffchainState object, and set
   * its parent, valueType, and key properties."
   *
   * @param {OffchainStateMap | OffchainStateMapRoot} parent
   * The parent of this state. This is either
   * an OffchainStateMap or an OffchainStateMapRoot.
   * @param valueType - FlexibleProvablePure<ValueType>
   * @param key - The key of the state.
   * @returns An OffchainState object
   */
  public static fromParent<KeyType, ValueType>(
    parent: OffchainStateMap | OffchainStateMapRoot,
    valueType: FlexibleProvablePure<ValueType>,
    key: Key<KeyType>
  ): OffchainState<KeyType, ValueType> {
    const state = new OffchainState<KeyType, ValueType>();
    state.parent = parent;
    state.valueType = valueType;
    state.key = key;
    return state;
  }

  /**
   * "Create a new OffchainState object with
   * the given value and parent, and return it."
   *
   * @param {ValueType} value - The value of the state.
   * @param {OffchainStateMap | OffchainStateMapRoot} [parent]
   * The parent of this state. If this
   * state is a child of another state, then the parent is the parent state.
   *
   * @returns An OffchainState object with the value and parent set.
   */
  // eslint-disable-next-line etc/no-misused-generics
  public static fromValue<KeyType, ValueType>(
    value: ValueType,
    parent?: OffchainStateMap | OffchainStateMapRoot
  ): OffchainState<KeyType, ValueType> {
    const state = new OffchainState<KeyType, ValueType>();
    state.value = value;
    state.parent = parent;
    return state;
  }

  /**
   * It creates a new offchain state, and sets
   * the value type to the given value type
   *
   * @param valueType - FlexibleProvablePure<ValueType>
   * @returns A new OffchainState object.
   */
  public static fromRoot<ValueType>(
    valueType: FlexibleProvablePure<ValueType>
  ): OffchainState<Field, ValueType> {
    const state = new OffchainState<Field, ValueType>();
    state.valueType = valueType;
    return state;
  }

  /**
   * This function returns a new OffchainStateMap object.
   *
   * @returns A new instance of OffchainStateMap
   */
  public static fromMap(): OffchainStateMap {
    return new OffchainStateMap();
  }

  public contract?: OffchainStateContract;

  // key under which the value is stored
  public key?: Key<KeyType>;

  // value of the state
  public value?: ValueType;

  public valueType?: FlexibleProvablePure<ValueType>;

  public witness?: MerkleMapWitness;

  // parent map, under which the value is stored under a key
  public parent?: OffchainStateMap | OffchainStateMapRoot;

  /**
   * It gets the value fields from the virtual storage
   *
   * @returns The value fields from the virtual storage.
   */
  public getValueFieldsFromVirtualStorage(): Field[] | undefined {
    if (!this.valueType) {
      throw errors.valueTypeNotFound();
    }

    if (!this.contract) {
      throw errors.contractNotFound();
    }

    if (!this.parent?.mapName) {
      throw errors.parentMapNotFound();
    }

    if (!this.key) {
      throw errors.keyNotFound();
    }

    return this.contract.virtualStorage.getValue(
      this.contract.address.toBase58(),
      this.parent.mapName.toString(),
      this.key.toString()
    );
  }

  /**
   * "If the value type is not found, throw an error. Otherwise,
   * get the value fields from virtual storage, and if they are not found,
   * throw an error. Otherwise, if the value type is not found,throw an error.
   * Otherwise, return the value type from the fields."
   *
   * The first thing to notice is that the function is not returning a value.
   * Instead, it is setting the value of the `this.value` property.
   *
   * @returns The value of the key in the virtual storage.
   */
  public getValue(defaultValue?: ValueType): ValueType {
    if (!this.valueType) {
      throw errors.valueTypeNotFound();
    }

    this.value = Circuit.witness<ValueType>(this.valueType, () =>
      this.provideValue(defaultValue)
    );

    return this.value;
  }

  public provideValue(defaultValue?: ValueType): ValueType {
    if (!this.valueType) {
      throw errors.valueTypeNotFound();
    }

    const valueFields = this.getValueFieldsFromVirtualStorage();

    if (!valueFields) {
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!defaultValue) {
        throw errors.valueFieldsNotFound();
      }

      return defaultValue;
    }

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return this.valueType.fromFields(valueFields) as ValueType;
  }

  /**
   * It returns a witness for the value of the key in the map
   *
   * @returns The witness is being returned.
   */
  public getWitness() {
    this.witness = Circuit.witness<MerkleMapWitness>(MerkleMapWitness, () => {
      if (!this.contract) {
        throw errors.contractNotFound();
      }

      if (!this.parent?.mapName) {
        throw errors.parentMapNotFound();
      }

      if (!this.key) {
        throw errors.keyNotFound();
      }

      // keep re-using the same witness, if it exists
      if (this.witness) {
        //Circuit.log('Reusing old witness for key: ', this.key.toField());
        return this.witness;
      }

      // Circuit.log('not reusing old witness, getting witness from virtual storage')
      const witness = this.contract.virtualStorage.getWitness(
        this.contract.address.toBase58(),
        this.parent.mapName.toString(),
        this.key.toString()
      );

      if (!witness) {
        throw errors.witnessNotFound();
      }

      return witness;
    });

    return this.witness;
  }

  /**
   * It gets the value of the offchain state
   *
   * @returns The value of the offchain state.
   */
  public get(): ValueType {
    if (!this.valueType) {
      throw errors.valueTypeNotFound();
    }

    const value = this.getValue();

    this.getWitness();

    this.assertIsInParentTree();
    return value;
  }

  public getOrDefault(defaultValue: ValueType): ValueType {
    this.getWitness();
    const exists = this.exists();

    /**
     * We have to provide a default value here, so that
     * in a case where the value does not exist, we can
     * still satisfy the underlying Circuit.witness with
     * the appropriate value return
     */
    const value = this.getValue(defaultValue);
    const isInParentTree = this.isInParentTree();

    /**
     * If the received value exists, check that it is
     * a part of the parent tree. If it does not exist,
     * we don't care if its part of the parent tree.
     */
    const isInParentTreeOrDefault = Circuit.if(
      exists,
      isInParentTree,
      Bool(true)
    );

    isInParentTreeOrDefault.assertTrue();

    return value;
  }

  public exists(): Bool {
    return this.notExists().not();
  }

  /**
   * If the value type is not found, throw an error.
   * Otherwise, get the witness and assert that the value
   * is in the parent tree.
   */
  public notExists(): Bool {
    if (!this.valueType) {
      throw errors.valueTypeNotFound();
    }

    this.getWitness();

    return this.isInParentTree();
  }

  public assertExists() {
    this.exists().assertTrue();
  }

  public assertNotExists() {
    this.notExists().assertTrue();
  }

  /**
   * It returns the hash of the value used in the tree
   *
   * @returns The hash of the value
   */
  public get treeValue(): Field {
    if (!this.valueType) {
      throw errors.valueTypeNotFound();
    }

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!this.value) {
      // default tree value, we need this for exists() to work correctly
      return Field(0);
    }

    const valueFields = this.valueType.toFields(this.value);
    return Poseidon.hash(valueFields);
  }

  /**
   * If the witness is not null, return the root and key of the parent tree.
   *
   * @returns The root hash and key of the parent tree.
   */
  public getComputedParentRootHashAndKey(): [Field, Field] {
    if (!this.witness) {
      throw errors.witnessNotFound();
    }

    // attempt to merge the current witness with the latest available witness
    this.witness = Circuit.witness<MerkleMapWitness>(MerkleMapWitness, () => {
      if (!this.witness) {
        throw errors.witnessNotFound();
      }

      if (!this.parent?.mapName) {
        throw errors.parentMapNotFound();
      }

      if (!this.contract) {
        throw errors.contractNotFound();
      }

      const lastUpdatedOffchainState =
        this.contract.getLastUpdatedOffchainState(
          this.parent.mapName.toField().toString()
        );

      // if there is no state/witness to merge with, return the existing witness
      if (
        !lastUpdatedOffchainState?.witness ||
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        !lastUpdatedOffchainState.value
      ) {
        Circuit.log('Using old witness', {
          thisKey: this.key?.toField(),
        });
        return this.witness;
      }

      Circuit.log('Ready to merge with witness', {
        thisKey: this.key?.toField(),
        lastUpdatedKey: lastUpdatedOffchainState.key?.toField(),
        lastUpdateValue: lastUpdatedOffchainState.value,
      });

      if (lastUpdatedOffchainState.key?.toString() === this.key?.toString()) {
        return lastUpdatedOffchainState.witness;
      }

      return mergeMerkleMapWitnesses(
        this.witness,
        lastUpdatedOffchainState.treeValue,
        lastUpdatedOffchainState.witness
      );
    });

    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return this.witness.computeRootAndKey(this.treeValue) as [Field, Field];
  }

  public assertIsInParentTree() {
    const isInParentTree = this.isInParentTree();

    isInParentTree.assertTrue();
  }

  /**
   * "Check if the state's key and root hash are consistent with the
   * parent's key and root hash."
   *
   * The function starts by checking if the state has a parent,
   * a witness, and a key. If any of these are missing, it throws an error.
   */
  public isInParentTree(): Bool {
    if (!this.parent) {
      throw errors.parentMapNotFound();
    }

    if (!this.witness) {
      throw errors.rootHashNotFound();
    }

    if (!this.key) {
      throw errors.keyNotFound();
    }

    // take the root hash of own parent
    this.parent.contract = this.contract;
    const parentRootHash = this.parent.getRootHash();

    if (!parentRootHash) {
      throw errors.parentMapNotFound();
    }

    // use own witness to compute the supposed parent root hash and key
    const [computedParentRootHash, computedParentKey] =
      this.getComputedParentRootHashAndKey();

    // check if the computed root hash equals the existing parent root hash
    const rootHashesEqual = parentRootHash.equals(computedParentRootHash);

    // check if the computed key equals the desired key
    const keysEqual = this.key.toField().equals(computedParentKey);

    const isInParentTree = rootHashesEqual.and(keysEqual);

    // continue checking the state's parent
    const parentIsInParentTree = this.parent.isInParentTree();

    return isInParentTree.and(parentIsInParentTree);
  }

  /**
   * It takes the value, key and contract and emits an event
   * that will be processed by the offchain storage
   */
  public emitSetEvent() {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!this.value) {
      throw errors.valueNotFound();
    }

    if (!this.valueType) {
      throw errors.valueTypeNotFound();
    }

    if (!this.key) {
      throw errors.keyNotFound();
    }

    if (!this.contract) {
      throw errors.contractNotFound();
    }

    if (!this.parent) {
      throw errors.parentMapNotFound();
    }

    const valueFields = this.valueType.toFields(this.value);

    // bunch of key hashes to indicate where the value
    // should be written in offchain storage when processed
    const path: Field[] = [...this.parent.getPath(), this.key.toField()];
    const pathLength = Field(path.length);

    /**
     * Protocol for events is: [pathLength, ...path, ...valueFields]
     *
     * pathLength: single Field describing how many fields does
     * a path include
     *
     * path: multiple Fields, describing the path where the value
     * should be written, the amount of path Fields is directly
     * dependant on `pathLength`
     *
     * valueFields: Field[] representation of the value being set
     */
    const eventFields = [pathLength, ...path, ...valueFields];

    /**
     * Example event that writes
     * [
     *  // amount of path fields, in our case just 'root' -> 'keyOnRoot'
     *  so this is 2
     *  2,
     *
     *  // path, just two fields here
     *  'root',
     *  'keyOnRoot'
     *
     *  // after the path ends, field values to be stored under path come next
     *  // some data structure serialized to fields, flattened to be part
     *  // of the `eventFields`
     *  1, // first field value
     *  2, // second field value
     *  3, // third field value
     * ]
     */

    // emit events here
    this.contract.self.body.events = Events.pushEvent(
      this.contract.self.body.events,
      eventFields
    );
  }

  /**
   * It sets the value of the current map entry,
   * and then updates the parent map's root hash.
   * It also emits a set event for the offchain storage.
   *
   * @param {ValueType} value - The value to be set.
   * @returns The value that was set.
   */
  // eslint-disable-next-line sonarjs/cognitive-complexity
  public set(
    value: ValueType,
    { shouldEmitEvent }: SetOptions = OffchainState.defaultSetOptions
  ): ValueType {
    if (!this.parent?.mapName) {
      throw errors.parentMapNotFound();
    }

    if (!this.key) {
      throw errors.keyNotFound();
    }

    if (!this.contract?.virtualStorage) {
      throw errors.virtualStorageNotFound();
    }

    if (!this.valueType) {
      throw errors.valueTypeNotFound();
    }

    this.value = value;

    this.getWitness();

    const valueFields = this.valueType.toFields(this.value);
    Circuit.asProver(() => {
      if (!this.parent?.mapName) {
        throw errors.parentMapNotFound();
      }

      if (!this.key) {
        throw errors.keyNotFound();
      }

      if (!this.contract?.virtualStorage) {
        throw errors.virtualStorageNotFound();
      }

      if (!this.valueType) {
        throw errors.valueTypeNotFound();
      }

      this.contract.virtualStorage.setValue(
        this.contract.address.toBase58(),
        this.parent.mapName.toString(),
        this.key.toString(),
        valueFields
      );
    });

    const [computedParentRootHash, computedParentKey] =
      this.getComputedParentRootHashAndKey();

    this.key.toField().assertEquals(computedParentKey);
    this.parent.setRootHash(computedParentRootHash);


    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    const lastUpdatedOffchainState = this as OffchainState<unknown, unknown>;
    this.contract.setLastUpdatedOffchainState(
      this.parent.mapName.toString(),
      lastUpdatedOffchainState
    );

    if (this.contract.rollingStateOptions.shouldEmitEvents && shouldEmitEvent) {
      this.emitSetEvent();
    }

    return value;
  }
}

export default OffchainState;

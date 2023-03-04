/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import {
  Field,
  Circuit,
  MerkleMap,
  type Bool,
  type FlexibleProvablePure,
} from 'snarkyjs';

import errors from './errors.js';
import type Key from './key.js';
// eslint-disable-next-line import/no-cycle
import OffchainState from './offchainState.js';
import type OffchainStateContract from './offchainStateContract.js';
import type OffchainStateMapRoot from './offchainStateMapRoot.js';

/* `OffchainStateMap` is a class that represents a map of `OffchainState`s */
class OffchainStateMap {
  /* Creating a new empty MerkleMap and returning the root hash of that map. */
  public static initialRootHash = () =>
    Circuit.witness(Field, () => {
      const map = new MerkleMap();
      return map.getRoot();
    });

  /**
   * Create a new OffchainStateMap that is a child of the given parent,
   * and that uses the given mapName.
   *
   * @param {OffchainStateMap} parent
   * The parent map that this map is a child of.
   *
   * @param mapName - The name of the map.
   * @returns A new OffchainStateMap object.
   */
  public static fromParent(
    parent: OffchainStateMap,
    mapName: Key<unknown>
  ): OffchainStateMap {
    const map = new OffchainStateMap();
    map.parent = parent;
    map.mapName = mapName;
    return map;
  }

  public contract?: OffchainStateContract;

  public parent?: OffchainStateMap | OffchainStateMapRoot;

  public mapName?: Key<unknown>;

  public rootHash?: OffchainState<unknown, Field>;

  /**
   * It returns the value of the mapName property.
   * @returns The key is being returned.
   */
  public get key() {
    return this.mapName;
  }

  /**
   * If the key and parent are not null, then create a new OffchainState object
   * using the parent and key, and set the contract to the contract of
   * the current object.
   *
   * @returns The root hash of the offchain state.
   */
  public initializeRootHash() {
    if (!this.key) {
      throw errors.keyNotFound();
    }

    if (!this.parent) {
      throw errors.parentMapNotFound();
    }

    // construct the OffchainState using `this` as a parent
    const rootHash = OffchainState.fromParent(this.parent, Field, this.key);
    rootHash.contract = this.contract;
    return rootHash;
  }

  /**
   * This function returns the root hash of the map
   *
   * @returns The root hash of the map.
   */
  public getRootHash() {
    this.rootHash ??= this.initializeRootHash();
    this.rootHash.get();

    return this.rootHash.value;
  }

  /**
   * Set the root hash of this map, and set the root hash of the parent map
   * to the computed parent root hash of this map.
   *
   * @param {Field} rootHash - The root hash of the map.
   */
  public setRootHash(rootHash: Field) {
    this.rootHash ??= this.initializeRootHash();
    this.rootHash.set(rootHash);

    if (!this.parent) {
      throw errors.parentMapNotFound();
    }

    const [computedParentRootHash] =
      this.rootHash.getComputedParentRootHashAndKey();

    this.parent.setRootHash(computedParentRootHash);
  }

  /**
   * It sets the root hash of the offchain state map to the initial root hash
   */
  public setInitialRootHash() {
    this.setRootHash(OffchainStateMap.initialRootHash());
  }

  public getPath(): Field[] {
    if (!this.key) {
      throw errors.keyNotFound();
    }

    if (!this.parent) {
      throw errors.parentMapNotFound();
    }

    return [...this.parent.getPath(), this.key.toField()];
  }

  public assertIsInParentTree() {
    const isInParentTree = this.isInParentTree();
    isInParentTree.assertTrue();
  }

  /**
   * If the rootHash is not found, throw an error. If the parent is not found,
   * throw an error. If the rootHash is found, assert that it is in the
   * parent tree. If the parent is found, assert that it is in the parent tree.
   *
   * @returns The rootHash's OffchainState is being returned.
   */
  public isInParentTree(): Bool {
    if (!this.rootHash) {
      throw errors.rootHashNotFound();
    }

    if (!this.parent) {
      throw errors.parentMapNotFound();
    }

    // use the rootHash's OffchainState to assert
    // if the own rootHash is part of the parent tree
    const rootHashIsInParentTree = this.rootHash.isInParentTree();

    // if there is a parent, continue asserting upwards
    const parentIsInParentTree = this.parent.isInParentTree();

    return rootHashIsInParentTree.and(parentIsInParentTree);
  }

  /**
   * This function returns an OffchainStateMap object that is associated with
   * the current contract (parent) and the given map name.
   *
   * @param mapName - The name of the map you want to create.
   * @returns A map of offchain state
   */
  public getMap(mapName: Key<unknown>): OffchainStateMap {
    const map = OffchainStateMap.fromParent(this, mapName);
    map.contract = this.contract;
    return map;
  }

  /**
   * Get the value of a key from the map, and return it as a new OffchainState
   * object that can be used to set the value of the key later.
   *
   * @param valueType - The type of the value you want to get.
   * @param key - The key to the value you want to get.
   * @returns A tuple of the value and the state.
   */
  public get<KeyType, ValueType>(
    valueType: FlexibleProvablePure<ValueType>,
    key: Key<KeyType>
  ): [ValueType, OffchainState<KeyType, ValueType>] {
    const state = OffchainState.fromParent(this, valueType, key);
    state.contract = this.contract;
    const value = state.get();
    return [value, state];
  }

  public getOrDefault<KeyType, ValueType>(
    valueType: FlexibleProvablePure<ValueType>,
    key: Key<KeyType>,
    defaultValue: ValueType
  ): [ValueType, OffchainState<KeyType, ValueType>] {
    const state = OffchainState.fromParent(this, valueType, key);
    state.contract = this.contract;
    const value = state.getOrDefault(defaultValue);
    return [value, state];
  }

  /**
   * This function sets the value of a key in the offchain state,
   * and returns the value and the offchain state.
   *
   * @param valueType
   * The type of the value that will be stored in the offchain state.
   *
   * @param key - The key to store the value under.
   * @param {ValueType} value - The value to set
   * @returns The value and the state.
   */
  public set<KeyType, ValueType>(
    valueType: FlexibleProvablePure<ValueType>,
    key: Key<KeyType>,
    value: ValueType
  ): [ValueType, OffchainState<KeyType, ValueType>] {
    const state = OffchainState.fromParent(this, valueType, key);
    state.contract = this.contract;
    state.set(value);
    return [value, state];
  }

  /**
   * Assert that the given key does not exist in the offchain state.
   *
   * @param key - The key to the offchain state.
   */
  public assertNotExists<KeyType>(key: Key<KeyType>) {
    this.notExists(key).assertTrue();
  }

  public assertExists<KeyType>(key: Key<KeyType>) {
    this.exists(key).assertTrue();
  }

  public exists<KeyType>(key: Key<KeyType>): Bool {
    const state = OffchainState.fromParent(this, Field, key);
    state.contract = this.contract;
    return state.exists();
  }

  public notExists<KeyType>(key: Key<KeyType>): Bool {
    const state = OffchainState.fromParent(this, Field, key);
    state.contract = this.contract;
    return state.notExists();
  }
}

export default OffchainStateMap;

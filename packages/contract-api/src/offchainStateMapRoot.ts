/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { Field } from 'snarkyjs';

import errors from './errors.js';
import Key from './key.js';
import OffchainState from './offchainState.js';
import type OffchainStateContract from './offchainStateContract.js';
import type OffchainStateMap from './offchainStateMap.js';

interface GetOnChainRootHashOptions {
  shouldEmitPrecondition: boolean;
}

interface SetOnChainRootHashOptions {
  shouldEmitAccountUpdate: boolean;
}

/* It's a class that stores the root hash of the off-chain state map */
class OffchainStateMapRoot {
  public static defaultGetOnChainRootHashOptions: GetOnChainRootHashOptions = {
    shouldEmitPrecondition: true,
  };

  public static defaultSetOnChainRootHashOptions: SetOnChainRootHashOptions = {
    shouldEmitAccountUpdate: true,
  };

  public parent?: OffchainStateMap;

  public rootHash?: OffchainState<unknown, Field>;

  /**
   * Name of the root map, hardcoded within this class as
   * a reasonable default.
   */
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  public mapName: Key<unknown> = Key.fromString('root') as Key<unknown>;

  public constructor(public contract: OffchainStateContract) {}

  /**
   * It returns the value of the mapName property.
   * @returns The key is being returned.
   */
  public get key() {
    return this.mapName;
  }

  public getPath(): Field[] {
    return [this.key.toField()];
  }

  /**
   * It asserts that the root hash of the off-chain state
   * is equal to the root hash of the on-chain state
   */
  public assertEqualsOnChainRootHash() {
    const rootHash = this.rootHash?.value;

    if (!rootHash) {
      throw errors.rootHashNotFound();
    }

    this.contract.offchainStateRootHash.assertEquals(rootHash);
  }

  /**
   * It gets the root hash from the contract and stores it in the class
   * @param {GetOnChainRootHashOptions} options - GetOnChainRootHashOptions =
   * OffchainStateMapRoot.defaultGetOnChainRootHashOptions
   * @returns The root hash of the offchain state map.
   */
  public getOnChainRootHash(
    options: GetOnChainRootHashOptions = OffchainStateMapRoot.defaultGetOnChainRootHashOptions
  ) {
    const rootHash = this.contract.offchainStateRootHash.get();

    this.rootHash = OffchainState.fromValue<unknown, Field>(rootHash);

    if (options.shouldEmitPrecondition) {
      this.assertEqualsOnChainRootHash();
    }

    return this.rootHash;
  }

  /**
   * It sets the root hash on the root
   * @param {Field} rootHash - The root hash of the offchain state map.
   * @param {SetOnChainRootHashOptions} options - SetOnChainRootHashOptions =
   * OffchainStateMapRoot.defaultSetOnChainRootHashOptions
   */
  public setRootHash(
    rootHash: Field,
    options: SetOnChainRootHashOptions = OffchainStateMapRoot.defaultSetOnChainRootHashOptions
  ) {
    // eslint-disable-next-line unicorn/no-negated-condition
    if (!this.rootHash?.value) {
      this.rootHash = OffchainState.fromValue(rootHash);
    } else {
      this.rootHash.value = rootHash;
    }

    if (options.shouldEmitAccountUpdate) {
      this.setOnChainRootHash();
    }
  }

  /**
   * `initializeRootHash` creates a new `OffchainState` object,
   *  and sets its `contract` property to the `OffchainState` contract
   * @returns A new OffchainState object with the value of 0.
   */
  public initializeRootHash() {
    // construct the OffchainState using `this` as a parent
    const rootHash = OffchainState.fromValue<unknown, Field>(Field(0));
    rootHash.contract = this.contract;
    return rootHash;
  }

  /**
   * It gets the root hash from the blockchain.
   */
  public getRootHash() {
    this.getOnChainRootHash();
  }

  /**
   * If the on-chain root hash is not equal to
   * the parent chain root hash, then throw an error.
   */
  public assertInParentTree() {
    this.assertEqualsOnChainRootHash();
  }

  /**
   * It sets the on-chain root hash to the off-chain root hash
   * @param {Field} [overrideRootHash]
   * This is the root hash that you want to set on-chain.
   * If you don't provide this, the root hash will be taken
   * from the own rootHash property.
   */
  public setOnChainRootHash(overrideRootHash?: Field) {
    const rootHash = overrideRootHash ?? this.rootHash?.value;

    if (!rootHash) {
      throw errors.rootHashNotFound();
    }

    this.contract.offchainStateRootHash.set(rootHash);
  }
}

export default OffchainStateMapRoot;

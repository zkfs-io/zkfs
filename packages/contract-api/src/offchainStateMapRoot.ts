/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import uniqueId from 'lodash/uniqueId.js';
import { Bool, type Field, MerkleMap } from 'snarkyjs';

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

  public static get mapName(): Key<unknown> {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return Key.fromString('root') as Key<unknown>;
  }

  public static get initialRootHash(): Field {
    return new MerkleMap().getRoot();
  }

  public parent?: OffchainStateMap;

  public rootHash?: OffchainState<unknown, Field>;

  public debugId = uniqueId();

  /**
   * Name of the root map, hardcoded within this class as
   * a reasonable default.
   */
  public mapName: Key<unknown> = OffchainStateMapRoot.mapName;

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
    const rootHash =
      this.rootHash?.value ?? this.contract.offchainStateRootHash.get();

    this.rootHash = OffchainState.fromValue<unknown, Field>(rootHash);

    if (
      options.shouldEmitPrecondition &&
      this.contract.rollingStateOptions.shouldEmitPrecondition
    ) {
      this.assertEqualsOnChainRootHash();
    }

    return rootHash;
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

    if (
      this.contract.rollingStateOptions.shouldEmitAccountUpdates &&
      options.shouldEmitAccountUpdate
    ) {
      this.setOnChainRootHash();
    }
  }

  /**
   * It gets the root hash from the blockchain.
   */
  public getRootHash() {
    this.getOnChainRootHash();

    if (!this.rootHash?.value) {
      throw errors.rootHashNotFound();
    }

    return this.rootHash.value;
  }

  /**
   * If the on-chain root hash is not equal to
   * the parent chain root hash, then throw an error.
   */
  public isInParentTree() {
    if (!this.rootHash?.value) {
      throw errors.rootHashNotFound();
    }

    /**
     * Checking if the current root is in the parent tree
     * happens at getRootHash() via a precondition.
     * Therefore we can just assume that the root map
     * is always in the parent tree.
     */
    return Bool(true);
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

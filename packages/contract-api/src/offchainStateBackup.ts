/* eslint-disable no-console */
/* eslint-disable lines-around-comment */
/* eslint-disable etc/no-commented-out-code */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-extraneous-class, @shopify/no-fully-static-classes */
import { VirtualStorage } from '@zkfs/virtual-storage';
import type { Field } from 'snarkyjs';
import _ from 'lodash';

import type OffchainStateContract from './offchainStateContract.js';
import OffchainStateMapRoot from './offchainStateMapRoot.js';
import type OffchainState from './offchainState.js';

interface Backup {
  initial: {
    data?: string;
    rootHash?: Field;
  };
  latest: {
    data?: string;
    rootHash?: Field;
  };
}

type LastUpdatedOffchainState = Record<
  // map name
  string,
  // instance of the last updated offchain state on that map
  OffchainState<unknown, unknown> | undefined
> | undefined;

interface LastUpdatedOffchainStateBackup {
  initial: {
    lastUpdatedOffchainState?: LastUpdatedOffchainState | undefined;
  };
  latest: {
    lastUpdatedOffchainState?: LastUpdatedOffchainState | undefined;
  };
}

function cloneIfDefined(obj: LastUpdatedOffchainState) {
  return obj ? _.cloneDeep(obj) : undefined;
}

class OffchainStateBackup {
  public static isProving = false;

  public static virtualStorage = new VirtualStorage();

  public static virtualStorageBackup: Backup = { initial: {}, latest: {} };

  public static lastUpdatedOffchainState: LastUpdatedOffchainState = undefined;

  public static lastUpdatedOffchainStateBackup: LastUpdatedOffchainStateBackup =
    {
      initial: {},
      latest: {},
    };

  public static resetVirtualStorage() {
    this.virtualStorage = new VirtualStorage();
  }

  public static backupInitial(target: OffchainStateContract) {
    if (this.isProving) {
      return;
    }

    this.virtualStorageBackup.initial.maps = JSON.stringify(
      target.virtualStorage.maps
    );
    this.virtualStorageBackup.initial.data = JSON.stringify(
      target.virtualStorage.data
    );

    this.lastUpdatedOffchainStateBackup.initial.lastUpdatedOffchainState =
      cloneIfDefined(target.lastUpdatedOffchainState);
  }

  public static backupLatest(target: OffchainStateContract) {
    if (this.isProving) {
      return;
    }

    this.virtualStorageBackup.latest.maps = JSON.stringify(
      target.virtualStorage.maps
    );
    this.virtualStorageBackup.latest.data = JSON.stringify(
      target.virtualStorage.data
    );
    this.lastUpdatedOffchainStateBackup.latest.lastUpdatedOffchainState = cloneIfDefined(target.lastUpdatedOffchainState);

  }

  public static restoreInitial(target: OffchainStateContract) {
    if (
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !this.virtualStorageBackup.initial.data
    ) {
      throw new Error('Unable to restore off-chain state, no backup found');
    }

    target.virtualStorage.data = JSON.parse(
      this.virtualStorageBackup.initial.data
    );

    this.lastUpdatedOffchainState = cloneIfDefined(this.lastUpdatedOffchainStateBackup.initial.lastUpdatedOffchainState);


    target.root = new OffchainStateMapRoot(target);
  }

  public static restoreLatest(target: OffchainStateContract) {
    if (
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !this.virtualStorageBackup.latest.data
    ) {
      throw new Error('Unable to restore off-chain state, no backup found');
    }

    target.virtualStorage.data = JSON.parse(
      this.virtualStorageBackup.latest.data
    );

    target.lastUpdatedOffchainState = cloneIfDefined(this.lastUpdatedOffchainStateBackup.latest.lastUpdatedOffchainState)
  }
}



export default OffchainStateBackup;

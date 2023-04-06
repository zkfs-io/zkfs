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

type LastUpdatedOffchainState = OffchainStateContract['lastUpdatedOffchainState'];

interface LastUpdatedOffchainStateBackup {
  initial: {
    lastUpdatedOffchainState?: LastUpdatedOffchainState;
  };
  latest: {
    lastUpdatedOffchainState?: LastUpdatedOffchainState;
  };
}

class OffchainStateBackup {
  public static virtualStorage = new VirtualStorage();

  public static virtualStorageBackup: Backup = { initial: {}, latest: {} };

  public static lastUpdatedOffchainStateBackup: LastUpdatedOffchainStateBackup =
    {
      initial: {},
      latest: {},
    };

  public static resetVirtualStorage() {
    this.virtualStorage = new VirtualStorage();
  }

  public static backupInitial(target: OffchainStateContract) {
    this.virtualStorageBackup.initial.data = JSON.stringify(
      target.virtualStorage.data
    );
    this.lastUpdatedOffchainStateBackup.initial.lastUpdatedOffchainState =
      _.cloneDeep(target.lastUpdatedOffchainState);
  }

  public static backupLatest(target: OffchainStateContract) {
    this.virtualStorageBackup.latest.data = JSON.stringify(
      target.virtualStorage.data
    );
    this.lastUpdatedOffchainStateBackup.latest.lastUpdatedOffchainState =
      _.cloneDeep(target.lastUpdatedOffchainState);
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
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    // if (!this.lastUpdatedOffchainStateBackup.initial.lastUpdatedOffchainState) {
    //   throw new Error('Unable to restore off-chain state, no backup found');
    // }
    target.lastUpdatedOffchainState = _.cloneDeep(
      this.lastUpdatedOffchainStateBackup.initial.lastUpdatedOffchainState
    );
    console.log('restore initial', target.lastUpdatedOffchainState)

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

    // // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    // if (!this.lastUpdatedOffchainStateBackup.latest.lastUpdatedOffchainState) {
    //   throw new Error('Unable to restore off-chain state, no backup found');
    // }
    target.lastUpdatedOffchainState = _.cloneDeep(
      this.lastUpdatedOffchainStateBackup.latest.lastUpdatedOffchainState
    );
  }
}

export default OffchainStateBackup;

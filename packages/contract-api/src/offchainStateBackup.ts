/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
// eslint-disable-next-line max-len
/* eslint-disable @typescript-eslint/no-extraneous-class, @shopify/no-fully-static-classes */
import { VirtualStorage } from '@zkfs/virtual-storage';
import type { Field } from 'snarkyjs';

import type OffchainStateContract from './offchainStateContract.js';
import OffchainStateMapRoot from './offchainStateMapRoot.js';

interface Backup {
  initial: {
    maps?: string;
    data?: string;
    rootHash?: Field;
  };
  latest: {
    maps?: string;
    data?: string;
    rootHash?: Field;
  };
}

class OffchainStateBackup {
  public static isProving = false;

  public static virtualStorage = new VirtualStorage();

  public static virtualStorageBackup: Backup = { initial: {}, latest: {} };

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
  }

  public static restoreInitial(target: OffchainStateContract) {
    if (
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !this.virtualStorageBackup.initial.data ||
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !this.virtualStorageBackup.initial.maps
    ) {
      throw new Error('Unable to restore off-chain state, no backup found');
    }

    target.virtualStorage.maps = JSON.parse(
      this.virtualStorageBackup.initial.maps
    );
    target.virtualStorage.data = JSON.parse(
      this.virtualStorageBackup.initial.data
    );

    target.root = new OffchainStateMapRoot(target);
  }

  public static restoreLatest(target: OffchainStateContract) {
    if (
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !this.virtualStorageBackup.latest.data ||
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      !this.virtualStorageBackup.latest.maps
    ) {
      throw new Error('Unable to restore off-chain state, no backup found');
    }

    target.virtualStorage.maps = JSON.parse(
      this.virtualStorageBackup.latest.maps
    );
    target.virtualStorage.data = JSON.parse(
      this.virtualStorageBackup.latest.data
    );
  }
}

export default OffchainStateBackup;

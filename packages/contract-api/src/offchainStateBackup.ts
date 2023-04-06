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

type LastUpdatedOffchainState =
  OffchainStateContract['lastUpdatedOffchainState'];

interface LastUpdatedOffchainStateBackup {
  initial: {
    lastUpdatedOffchainState?: LastUpdatedOffchainState | undefined;
  };
  latest: {
    lastUpdatedOffchainState?: LastUpdatedOffchainState | undefined;
  };
}

class OffchainStateBackup {
  public static virtualStorage = new VirtualStorage();

  public static virtualStorageBackup: Backup = { initial: {}, latest: {} };

  public static lastUpdatedOffchainState:
    | Record<
      // map name
      string,
      // instance of the last updated offchain state on that map
      OffchainState<unknown, unknown> | undefined
    >
    | undefined = undefined;

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
    console.log(
      'initial state to be backed up',
      target.lastUpdatedOffchainState
    );
    // console.log(
    //   'backup initial value',
    //   target
    //     .getLastUpdatedOffchainState(
    //       '26066477330778984202216424320685767887570180679420406880153508397309006440830'
    //     )
    //     ?.value?.toString()
    // );

    this.lastUpdatedOffchainStateBackup.initial.lastUpdatedOffchainState =
      target.lastUpdatedOffchainState
        ? _.cloneDeep(target.lastUpdatedOffchainState)
        : undefined;
  }

  public static backupLatest(target: OffchainStateContract) {
    this.virtualStorageBackup.latest.data = JSON.stringify(
      target.virtualStorage.data
    );
    this.lastUpdatedOffchainStateBackup.latest.lastUpdatedOffchainState = target.lastUpdatedOffchainState ?
      _.cloneDeep(target.lastUpdatedOffchainState) : undefined;
    console.log(
      'backup latest',
      target
        .getLastUpdatedOffchainState(
          '26066477330778984202216424320685767887570180679420406880153508397309006440830'
        )
        ?.value?.toString() ?? 'undefined'
    );
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

    this.lastUpdatedOffchainState = this.lastUpdatedOffchainStateBackup.initial
      .lastUpdatedOffchainState
      ? _.cloneDeep(
        this.lastUpdatedOffchainStateBackup.initial.lastUpdatedOffchainState
      ) : undefined;

    console.log(
      'restore initial',
      target
        .getLastUpdatedOffchainState(
          '26066477330778984202216424320685767887570180679420406880153508397309006440830'
        )
        ?.value?.toString() ?? 'undefined'
    );

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

    console.log(this.lastUpdatedOffchainStateBackup.latest.lastUpdatedOffchainState)
    target.lastUpdatedOffchainState = _.cloneDeep(
      this.lastUpdatedOffchainStateBackup.latest.lastUpdatedOffchainState
    );
    console.log(
      'restore latest',
      target.lastUpdatedOffchainState ? target.lastUpdatedOffchainState[
        '26066477330778984202216424320685767887570180679420406880153508397309006440830'
      ] : 'undefined'
    );

  }
}

export default OffchainStateBackup;

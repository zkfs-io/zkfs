/* eslint-disable max-statements */
/* eslint-disable jest/consistent-test-it */
/* eslint-disable no-console */
/* eslint-disable jest/require-top-level-describe */

import { Key } from '@zkfs/contract-api';
import OffchainStateBackup from '@zkfs/contract-api/dist/offchainStateBackup.js';
import { AccountUpdate, Circuit, MerkleMap, Poseidon, UInt64 } from 'snarkyjs';

import Counter2 from './counter2.js';
import describeContract, { withTimer } from './describeContract.js';

Error.stackTraceLimit = 10_000_000;

// eslint-disable-next-line jest/require-hook
describeContract<Counter2>('counter', Counter2, (context) => {
  async function localDeploy() {
    const {
      deployerAccount,
      deployerKey,
      zkAppPrivateKey,
      zkApp,
      contractApi,
    } = context();
    zkApp.lastUpdatedOffchainState = undefined;
    const tx = await withTimer(
      'transaction',
      async () =>
        await contractApi.transaction(zkApp, deployerAccount, () => {
          AccountUpdate.fundNewAccount(deployerAccount);
          zkApp.deploy();
        })
    );

    await withTimer('prove', async () => await tx.prove());

    // this tx needs .sign(), because `deploy()` adds an account update
    // that requires signature authorization
    await tx.sign([deployerKey, zkAppPrivateKey]).send();
    return tx;
  }

  it('correctly updates the count state on the `Counter` smart contract', async () => {
    expect.assertions(1);
    console.log(UInt64.from(0))

    const map = new MerkleMap();
    console.log('root before init should be', map.getRoot().toString());

    const count1 = Key.fromString('count1').toField();
    map.set(count1, Poseidon.hash(UInt64.from(0).toFields()));

    const count2 = Key.fromString('count2').toField();
    map.set(count2, Poseidon.hash(UInt64.from(0).toFields()));
    console.log('root after init should be', map.getRoot().toString());

    map.set(count1, Poseidon.hash(UInt64.from(1).toFields()));
    console.log(
      'root after setting count1 should be',
      map.getRoot().toString()
    );

    map.set(count2, Poseidon.hash(UInt64.from(2).toFields()));
    console.log(
      'root after setting count2 should be',
      map.getRoot().toString()
    );
    console.log('final root after update should be', map.getRoot().toString());

    const map2 = new MerkleMap();
    map2.set(count1, Poseidon.hash(UInt64.from(0).toFields()));
    map2.set(count2, Poseidon.hash(UInt64.from(2).toFields()));
    console.log('root if only count2 was set', map2.getRoot().toString());

    const { senderAccount, senderKey, zkApp, contractApi } = context();

    const tx0 = await localDeploy();

    OffchainStateBackup.restoreLatest(zkApp);
    console.log('value after init should be 0',
      (
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        zkApp.getLastUpdatedOffchainState(
          '26066477330778984202216424320685767887570180679420406880153508397309006440830'
        )?.value as UInt64
      ).toString()
    );

    console.log('Counter.deploy() successful, initial offchain state:', {
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
      data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tx: tx0.toPretty(),
    });

    console.log('Counter.update(), updating the offchain state...');
    // update transaction
    const tx1 = await withTimer(
      'transaction',
      async () =>
        await contractApi.transaction(zkApp, senderAccount, () => {
          zkApp.update();
        })
    );

    console.log('Counter.update(), proving');
    await withTimer('prove', async () => await tx1.prove());
    await tx1.sign([senderKey]).send();


    OffchainStateBackup.restoreLatest(zkApp);



    // let updatedCountOne: UInt64 | undefined;
    // Circuit.asProver(() => {
    //   updatedCountOne = zkApp.count1.get();
    // })
    // expect(updatedCountOne!.toString()).toStrictEqual(UInt64.from(1).toString());
    // zkApp.lastUpdatedOffchainState =
    //   OffchainStateBackup.lastUpdatedOffchainStateBackup.latest.lastUpdatedOffchainState;

    console.log('Counter.update() successful, new offchain state:', {
      //count: updatedCountOne.toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
      data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tx: tx1.toPretty(),
    });

    console.log(
      'Counter.update() the second time, updating the offchain state...'
    );

    // // update transaction
    const tx2 = await withTimer(
      'transaction',
      async () =>
        await contractApi.transaction(zkApp, senderAccount, () => {
          console.log('running update');
          zkApp.update();
        })
    );

    console.log('proving tx2');
    await withTimer('prove', async () => await tx2.prove());
    await tx2.sign([senderKey]).send();

    OffchainStateBackup.restoreLatest(zkApp);
    console.log('value after update #2 should be 4',
      (
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        zkApp.getLastUpdatedOffchainState(
          '26066477330778984202216424320685767887570180679420406880153508397309006440830'
        )?.value as UInt64
      ).toString()
    );

    console.log('getting count')
    // const updatedCountTwo = zkApp.count1.get();
    // const updatedCount3 = zkApp.count2.get();

    // expect(updatedCountTwo.toString()).toStrictEqual(UInt64.from(2).toString());
    // expect(updatedCount3.toString()).toStrictEqual(UInt64.from(4).toString());

    console.log('Counter.update() 2 successful, new offchain state:', {
      //count: updatedCountTwo.toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
      data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tx: tx2.toPretty(),
    });
    map.set(count1, Poseidon.hash(UInt64.from(2).toFields()));
    map.set(count2, Poseidon.hash(UInt64.from(4).toFields()));
    expect(zkApp.offchainStateRootHash.get().toString()).toBe(map.getRoot().toString())
  });
});

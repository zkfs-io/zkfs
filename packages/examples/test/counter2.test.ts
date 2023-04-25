/* eslint-disable max-statements */
/* eslint-disable jest/consistent-test-it */
/* eslint-disable no-console */
/* eslint-disable jest/require-top-level-describe */

import { Key } from '@zkfs/contract-api';
import { AccountUpdate, MerkleMap, Poseidon, UInt64 } from 'snarkyjs';

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

    await withTimer(
      'prove',
      async () => await contractApi.prove(zkApp, async () => await tx.prove())
    );

    await tx.sign([deployerKey, zkAppPrivateKey]).send();
    contractApi.restoreLatest(zkApp);

    return tx;
  }

  it('correctly updates the count state on the `Counter` smart contract', async () => {
    expect.assertions(1);

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const { map, count1, count2 } = manualMapTesting();

    const { senderAccount, senderKey, zkApp, contractApi } = context();

    const tx0 = await localDeploy();

    console.log('Counter.deploy() successful, initial offchain state:', {
      count1: zkApp.count1.get().toString(),
      count2: zkApp.count2.get().toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
      data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tx: tx0.toPretty(),
    });

    console.log('Counter.update(), updating the offchain state...');
    const tx1 = await withTimer(
      'transaction',
      async () =>
        await contractApi.transaction(zkApp, senderAccount, () => {
          zkApp.update();
        })
    );

    await withTimer(
      'prove',
      async () => await contractApi.prove(zkApp, async () => await tx1.prove())
    );
    await tx1.sign([senderKey]).send();

    contractApi.restoreLatest(zkApp);

    console.log('Counter.update() successful, new offchain state:', {
      count1: zkApp.count1.get().toString(),
      count2: zkApp.count2.get().toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
      data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tx: tx1.toPretty(),
    });


    console.log(
      'Counter.update() the second time, updating the offchain state...'
    );

    // update transaction
    const tx2 = await withTimer(
      'transaction',
      async () =>
        await contractApi.transaction(zkApp, senderAccount, () => {
          console.log('running update');
          zkApp.update();
        })
    );

    await withTimer(
      'prove',
      async () => await contractApi.prove(zkApp, async () => await tx2.prove())
    );
    await tx2.sign([senderKey]).send();

    contractApi.restoreLatest(zkApp);

    console.log('Counter.update() 2 successful, new offchain state:', {
      count1: zkApp.count1.get().toString(),
      count2: zkApp.count2.get().toString(),
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

function manualMapTesting() {
  //console.log(UInt64.from(0));

  const map = new MerkleMap();
  //console.log('root before init should be', map.getRoot().toString());

  const count1 = Key.fromString('count1').toField();
  map.set(count1, Poseidon.hash(UInt64.from(0).toFields()));

  const count2 = Key.fromString('count2').toField();
  map.set(count2, Poseidon.hash(UInt64.from(0).toFields()));
  //console.log('root after init should be', map.getRoot().toString());

  map.set(count1, Poseidon.hash(UInt64.from(1).toFields()));
  // console.log(
  //   'root after setting count1 should be',
  //   map.getRoot().toString()
  // );

  map.set(count2, Poseidon.hash(UInt64.from(2).toFields()));
  // console.log(
  //   'root after setting count2 should be',
  //   map.getRoot().toString()
  // );
  // console.log('final root after update should be', map.getRoot().toString());

  const map2 = new MerkleMap();
  map2.set(count1, Poseidon.hash(UInt64.from(0).toFields()));
  map2.set(count2, Poseidon.hash(UInt64.from(2).toFields()));
  //console.log('root if only count2 was set', map2.getRoot().toString());
  return { map, count1, count2 };
}


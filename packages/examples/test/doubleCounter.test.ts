/* eslint-disable max-statements */
/* eslint-disable jest/consistent-test-it */
/* eslint-disable no-console */
/* eslint-disable jest/require-top-level-describe */

import { Key } from '@zkfs/contract-api';
import { AccountUpdate, MerkleMap, Poseidon, UInt64 } from 'snarkyjs';

import DoubleCounter from './doubleCounter.js';
import describeContract, { withTimer } from './describeContract.js';

Error.stackTraceLimit = 10_000_000;

// eslint-disable-next-line jest/require-hook
describeContract<DoubleCounter>('doubleCounter', DoubleCounter, (context) => {
  async function localDeploy() {
    const {
      deployerAccount,
      deployerKey,
      zkAppPrivateKey,
      zkApp,
      contractApi,
    } = context();

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

    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    const { map } = manualMapTesting();

    expect(zkApp.offchainStateRootHash.get().toString()).toBe(
      map.getRoot().toString()
    );
  });
});

function manualMapTesting() {
  const map = new MerkleMap();

  const count1 = Key.fromString('count1').toField();
  map.set(count1, Poseidon.hash(UInt64.from(2).toFields()));

  const count2 = Key.fromString('count2').toField();
  map.set(count2, Poseidon.hash(UInt64.from(4).toFields()));

  return { map, count1, count2 };
}

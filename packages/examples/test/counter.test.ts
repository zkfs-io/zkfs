/* eslint-disable max-statements */
/* eslint-disable jest/consistent-test-it */
/* eslint-disable no-console */
/* eslint-disable jest/require-top-level-describe */

import { AccountUpdate, UInt64, MerkleMap, Poseidon } from 'snarkyjs';
import { Key } from '@zkfs/contract-api';

import Counter from './counter.js';
import describeContract, { withTimer } from './describeContract.js';

Error.stackTraceLimit = 10_000_000;

// eslint-disable-next-line jest/require-hook
describeContract<Counter>('counter', Counter, (context) => {
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

    // this tx needs .sign(), because `deploy()` adds an account update
    // that requires signature authorization
    await tx.sign([deployerKey, zkAppPrivateKey]).send();

    contractApi.restoreLatest(zkApp);

    return tx;
  }

  it('correctly updates the count state on the `Counter` smart contract', async () => {
    expect.assertions(3);

    const map = new MerkleMap();
    const count = Key.fromString('count').toField();
    map.set(count, Poseidon.hash(UInt64.from(2).toFields()));

    const { senderAccount, senderKey, zkApp, contractApi } = context();

    const tx0 = await localDeploy();

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

    console.log('Counter.update(), proving tx1');
    await withTimer(
      'prove',
      async () => await contractApi.prove(zkApp, async () => await tx1.prove())
    );
    await tx1.sign([senderKey]).send();

    contractApi.restoreLatest(zkApp);

    const updatedCountOne = zkApp.count.get();

    expect(updatedCountOne.toString()).toStrictEqual(UInt64.from(1).toString());

    console.log('Counter.update() successful, new offchain state:', {
      count: updatedCountOne.toString(),
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

    console.log('Counter.update(), proving tx2');
    await withTimer(
      'prove',
      async () => await contractApi.prove(zkApp, async () => await tx2.prove())
    );
    await tx2.sign([senderKey]).send();

    contractApi.restoreLatest(zkApp);

    console.log('getting count')
    const updatedCountTwo = zkApp.count.get();

    expect(updatedCountTwo.toString()).toStrictEqual(UInt64.from(2).toString());


    console.log('Counter.update() 2 successful, new offchain state:', {
      count: updatedCountTwo.toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
      data: zkApp.virtualStorage.data[zkApp.address.toBase58()],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tx: tx2.toPretty(),
    });

    expect(zkApp.offchainStateRootHash.get().toString()).toBe(map.getRoot().toString())
  });
});

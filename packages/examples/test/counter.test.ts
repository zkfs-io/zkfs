/* eslint-disable jest/consistent-test-it */
/* eslint-disable no-console */
/* eslint-disable jest/require-top-level-describe */

import { AccountUpdate, UInt64 } from 'snarkyjs';

import Counter from './counter.js';
import describeContract from './describeContract.js';

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

    const tx = await contractApi.transaction(zkApp, deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await tx.prove();

    // this tx needs .sign(), because `deploy()` adds an account update
    // that requires signature authorization
    await tx.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('correctly updates the count state on the `Counter` smart contract', async () => {
    expect.assertions(1);

    const { senderAccount, senderKey, zkApp, contractApi } = context();

    await localDeploy();

    console.log('Counter.deploy() successful, initial offchain state:', {
      count: zkApp.count.get().value.toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
    });

    console.log('Counter.update(), updating the offchain state...');

    // update transaction
    const tx = await contractApi.transaction(zkApp, senderAccount, () => {
      zkApp.update();
    });

    await tx.prove();
    await tx.sign([senderKey]).send();

    const { value: updatedCount } = zkApp.count.get();

    expect(updatedCount.toString()).toStrictEqual(UInt64.from(1).toString());

    console.log('Counter.update() successful, new offchain state:', {
      count: updatedCount.toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
    });
  });
});

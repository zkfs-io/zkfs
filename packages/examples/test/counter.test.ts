/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/init-declarations */
/* eslint-disable one-var */
/* eslint-disable putout/putout */
import {
  isReady,
  Mina,
  PrivateKey,
  type PublicKey,
  AccountUpdate,
  UInt64,
} from 'snarkyjs';
import { ContractApi } from '@zkfs/contract-api';
import { ZkfsNode } from '@zkfs/node';
/* eslint-disable jest/require-top-level-describe */

import { AccountUpdate, UInt64 } from 'snarkyjs';

import Counter from './counter.js';
import PeerNodeHelper from './helpers/peerNode.js';
import createLightClientConfig from './helpers/lightClient.js';
import describeContract from './describeContract.js';

const hasProofsEnabled = false;

describe('counter', () => {
  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Counter,
    contractApi: ContractApi,
    zkfsPeerNodeId: string,
    peerNodeHelper: PeerNodeHelper;

  beforeAll(async () => {
    await isReady;
    peerNodeHelper = new PeerNodeHelper();
    zkfsPeerNodeId = await peerNodeHelper.setup();
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (hasProofsEnabled) {
      await Counter.compile();
    }
  });

  beforeEach(async () => {
    // eslint-disable-next-line @typescript-eslint/naming-convention, new-cap
    const Local = Mina.LocalBlockchain({ proofsEnabled: hasProofsEnabled });
    Mina.setActiveInstance(Local);

    // first test account is the deployer
    [{ privateKey: deployerKey, publicKey: deployerAccount }] =
      Local.testAccounts;

    // second test account is the sender
    [, { privateKey: senderKey, publicKey: senderAccount }] =
      Local.testAccounts;
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Counter(zkAppAddress);

    // setup zkfs node as light client
    const zkfsConfig = await createLightClientConfig(zkfsPeerNodeId);
    const lightClientNode = new ZkfsNode(zkfsConfig);
    await lightClientNode.start();

    contractApi = new ContractApi(lightClientNode);

    await peerNodeHelper.watchAddress(zkAppAddress.toBase58());
  });

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
    return tx;
  }

  it('correctly updates the count state on the `Counter` smart contract', async () => {
    expect.assertions(2);

    Error.stackTraceLimit = 1000;

    const { senderAccount, senderKey, zkApp, contractApi } = context();

    const tx0 = await localDeploy();

    console.log('Counter.deploy() successful, initial offchain state:', {
      count: zkApp.count.get().value.toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
      data: zkApp.virtualStorage?.data[zkApp.address.toBase58()],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tx: tx0.toPretty(),
    });

    console.log('Counter.update(), updating the offchain state...');

    // update transaction
    const tx1 = await contractApi.transaction(zkApp, senderAccount, () => {
      zkApp.update();
    });

    await tx1.prove();
    await tx1.sign([senderKey]).send();

    // eslint-disable-next-line putout/putout
    const { value: updatedCountOne } = zkApp.count.get();

    expect(updatedCountOne.toString()).toStrictEqual(UInt64.from(1).toString());

    console.log('Counter.update() successful, new offchain state:', {
      count: updatedCountOne.toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
      data: zkApp.virtualStorage?.data[zkApp.address.toBase58()],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      tx: tx1.toPretty(),
    });

    console.log(
      'Counter.update() the second time, updating the offchain state...'
    );

    // update transaction
    const tx2 = await contractApi.transaction(zkApp, senderAccount, () => {
      zkApp.update();
    });

    await tx.prove();
    await tx.sign([senderKey]).send();

    // helper function for testing
    await peerNodeHelper.mockEventParser(
      zkApp.address.toBase58(),
      contractApi.virtualStorage
    );

    await contractApi.fetchOffchainState(zkApp);

    const { value: updatedCount } = zkApp.count.get();
    expect(updatedCount.toString()).toStrictEqual(UInt64.from(1).toString());

    console.log('Counter.update() successful, new offchain state:', {
      count: updatedCount.toString(),
      offchainStateRootHash: zkApp.offchainStateRootHash.get().toString(),
    });
  }, 30_000);
});

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

import Counter from './counter.js';
import PeerNodeHelper from './helpers/peerNode.js';
import createLightClientConfig from './helpers/lightClient.js';

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

    // setup ZkfsNode light client
    const zkfsConfig = await createLightClientConfig(zkfsPeerNodeId);
    const lightClientNode = new ZkfsNode(zkfsConfig);
    await lightClientNode.start();
    contractApi = new ContractApi(lightClientNode);

    await peerNodeHelper.watchAddress(zkAppAddress.toBase58());
    console.log('watching address', zkAppAddress.toBase58());
  });

  async function localDeploy() {
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

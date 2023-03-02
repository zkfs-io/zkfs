/* eslint-disable @typescript-eslint/naming-convention */
import { isReady, Mina, PrivateKey, type PublicKey } from 'snarkyjs';
import { ContractApi, type OffchainStateContract } from '@zkfs/contract-api';
import { ZkfsNode } from '@zkfs/node';

import PeerNodeHelper from './helpers/peerNode.js';
import createLightClientConfig from './helpers/lightClient.js';

interface ContractTestContext<ZkApp extends OffchainStateContract> {
  deployerAccount: PublicKey;
  deployerKey: PrivateKey;
  senderAccount: PublicKey;
  senderKey: PrivateKey;
  zkAppAddress: PublicKey;
  zkAppPrivateKey: PrivateKey;
  zkApp: ZkApp;
  contractApi: ContractApi;
  peerNode: PeerNodeHelper;
  mockEventParser: () => Promise<void>;
}

const hasProofsEnabled = false;

// eslint-disable-next-line max-params
function describeContract<ZkApp extends OffchainStateContract>(
  name: string,
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  Contract: typeof OffchainStateContract,
  testCallback: (context: () => ContractTestContext<ZkApp>) => void,
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  options?: { skip?: boolean; only?: boolean }
) {
  const { skip = false, only = false } = options ?? {
    skip: false,
    only: false,
  };
  // eslint-disable-next-line no-nested-ternary
  const describeFunction = skip
    ? describe.skip
    : only
    ? describe.only
    : describe;

  describeFunction(name, () => {
    let peerNode: PeerNodeHelper, peerId: string;

    beforeAll(async () => {
      await isReady;

      peerNode = new PeerNodeHelper();
      peerId = await peerNode.setup();

      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, putout/putout
      if (hasProofsEnabled) {
        await Contract.compile();
      }
    });

    // eslint-disable-next-line @typescript-eslint/init-declarations
    let context: ContractTestContext<ZkApp>;

    beforeEach(async () => {
      // eslint-disable-next-line new-cap
      const Local = Mina.LocalBlockchain({
        proofsEnabled: hasProofsEnabled,
        enforceTransactionLimits: true,
      });
      Mina.setActiveInstance(Local);

      // first test account is the deployer
      // eslint-disable-next-line putout/putout
      const [{ privateKey: deployerKey, publicKey: deployerAccount }] =
        Local.testAccounts;

      // second test account is the sender
      // eslint-disable-next-line putout/putout
      const [, { privateKey: senderKey, publicKey: senderAccount }] =
        Local.testAccounts;

      const zkAppPrivateKey = PrivateKey.random();
      const zkAppAddress = zkAppPrivateKey.toPublicKey();
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const zkApp = new Contract(zkAppAddress) as ZkApp;

      await peerNode.watchAddress(zkApp.address.toBase58());

      const lightClientConfig = await createLightClientConfig(peerId);
      const lightClient = new ZkfsNode(lightClientConfig);
      await lightClient.start();

      const contractApi = new ContractApi(lightClient);

      async function mockEventParser() {
        const { virtualStorage: contractApiVirtualStorage } = contractApi;
        await peerNode.mockEventParser(
          zkAppAddress.toBase58(),
          contractApiVirtualStorage
        );
      }

      context = {
        deployerAccount,
        deployerKey,
        senderAccount,
        senderKey,
        zkApp,
        zkAppAddress,
        zkAppPrivateKey,
        contractApi,
        peerNode,
        mockEventParser,
      };
    }, 20_000);

    testCallback(() => context);
  });
}

export default describeContract;

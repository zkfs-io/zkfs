import { isReady, Mina, PrivateKey, type PublicKey } from 'snarkyjs';
import { ContractApi, type OffchainStorageContract } from '@zkfs/contract-api';

interface ContractTestContext<ZkApp extends OffchainStorageContract> {
  deployerAccount: PublicKey;
  deployerKey: PrivateKey;
  senderAccount: PublicKey;
  senderKey: PrivateKey;
  zkAppAddress: PublicKey;
  zkAppPrivateKey: PrivateKey;
  zkApp: ZkApp;
  contractApi: ContractApi;
}

const hasProofsEnabled = false;

function describeContract<ZkApp extends OffchainStorageContract>(
  name: string,
  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/naming-convention, @typescript-eslint/prefer-readonly-parameter-types
  Contract: typeof OffchainStorageContract,
  testCallback: (context: () => ContractTestContext<ZkApp>) => void
) {
  beforeAll(async () => {
    await isReady;
    // eslint-disable-next-line max-len
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, putout/putout
    if (hasProofsEnabled) {
      await Contract.compile();
    }
  });

  // eslint-disable-next-line @typescript-eslint/init-declarations
  let context: ContractTestContext<ZkApp>;

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/naming-convention, new-cap
    const Local = Mina.LocalBlockchain({ proofsEnabled: hasProofsEnabled });
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
    const contractApi = new ContractApi();

    context = {
      deployerAccount,
      deployerKey,
      senderAccount,
      senderKey,
      zkApp,
      zkAppAddress,
      zkAppPrivateKey,
      contractApi,
    };
  });

  testCallback(() => context);
}

export default describeContract;

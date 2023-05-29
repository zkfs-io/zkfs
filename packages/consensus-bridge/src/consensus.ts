import { type Mina, PublicKey } from 'snarkyjs';

class Consensus {
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  public constructor(public mina: typeof Mina) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  public async verifyComputedRoot(
    account: string,
    computedRoot: string
  ): Promise<boolean> {
    const accountData = this.mina.getAccount(PublicKey.fromBase58(account));
    const offchainStateRoot = accountData.zkapp?.appState[0].toString();

    return offchainStateRoot === computedRoot;
  }
}

export default Consensus;

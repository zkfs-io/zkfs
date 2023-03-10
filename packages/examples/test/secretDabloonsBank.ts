/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable @typescript-eslint/naming-convention */
import {
  method,
  UInt64,
  Encryption,
  Field,
  Struct,
  type PublicKey,
  PrivateKey,
  Circuit,
  Group,
} from 'snarkyjs';
import {
  offchainState,
  OffchainStateContract,
  OffchainState,
  OffchainStateMap,
} from '@zkfs/contract-api';

class EncryptedDabloonsBalance extends Struct({
  value: [Field, Field],
  publicKey: Group,
}) {
  public static fromUInt64(balance: UInt64, encryptWithPublicKey: PublicKey) {
    const { cipherText: encryptedBalance, publicKey } = Encryption.encrypt(
      balance.toFields(),
      encryptWithPublicKey
    );

    Circuit.log('fromUInt64', {
      value: encryptedBalance,
      publicKey,
    });

    return new EncryptedDabloonsBalance({
      value: encryptedBalance,
      publicKey,
    });
  }

  public toUInt64(privateKey: PrivateKey) {
    Circuit.log('toUInt64', {
      value: this.value,
      publicKey: this.publicKey,
    });

    const fields = Encryption.decrypt(
      {
        cipherText: this.value,
        publicKey: this.publicKey,
      },
      privateKey
    );

    return UInt64.fromFields(fields);
  }
}

class SecretDabloonsBank extends OffchainStateContract {
  @offchainState() public dabloonBalance =
    OffchainState.fromRoot<EncryptedDabloonsBalance>(EncryptedDabloonsBalance);

  public init() {
    super.init();
    this.root.setRootHash(OffchainStateMap.initialRootHash());
  }

  public getDabloonBalance() {
    const defaultEncryptedDabloonBalance = EncryptedDabloonsBalance.fromUInt64(
      UInt64.from(0),
      this.address
    );

    return this.dabloonBalance.getOrDefault(defaultEncryptedDabloonBalance);
  }

  @method
  public deposit(amount: UInt64, privateKey: PrivateKey) {
    const dabloonBalance = this.getDabloonBalance().toUInt64(privateKey);

    const newDabloonBalance = EncryptedDabloonsBalance.fromUInt64(
      dabloonBalance.add(amount),
      this.address
    );

    this.dabloonBalance.set(newDabloonBalance);
  }
}

export default SecretDabloonsBank;

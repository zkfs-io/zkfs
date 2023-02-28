/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { Field, Poseidon } from 'snarkyjs';

// eslint-disable-next-line import/no-relative-packages
import type { FlexibleProvablePure } from '../../../node_modules/snarkyjs/dist/node/lib/circuit_value.js';

/* `Key` is a class that represents a key in the circuit */
class Key<KeyType> {
  /**
   * This function takes a key type and a key, and returns a key.
   *
   * @param keyType - FlexibleProvablePure<KeyType>
   * @param {KeyType} key - The key itself.
   * @returns A new instance of the Key class.
   */
  public static fromType<KeyType>(
    keyType: FlexibleProvablePure<KeyType>,
    key: KeyType
  ): Key<KeyType> {
    return new Key<KeyType>(keyType, key);
  }

  /**
   * It takes a string, converts it to an array of numbers, hashes
   * the array of numbers, and returns a Key<Field> object
   * @param {string} key - string - the string to be converted to a key
   * @returns A Key<Field>
   */
  public static fromString(key: string): Key<Field> {
    const fields = key
      .split('')
      .map((character) => character.codePointAt(0))
      .filter((code): code is number => code !== undefined)
      // eslint-disable-next-line new-cap
      .map((code) => Field(code));

    const keyField = Poseidon.hash(fields);

    return new Key<Field>(Field, keyField);
  }

  public constructor(
    public keyType: FlexibleProvablePure<KeyType>,
    public key: KeyType
  ) {}

  /**
   * It takes the key and keyType, and returns a field
   *
   * @returns The hash of the fields of the key type.
   */
  public toField(): Field {
    const fields: Field[] = this.keyType.toFields(this.key);
    return Poseidon.hash(fields);
  }

  /**
   * The toString() function returns a string representation of the object
   *
   * @returns The toString() method is being called on the toField() method.
   */
  public toString(): string {
    return this.toField().toString();
  }
}

export default Key;

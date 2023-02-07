import { Field, Poseidon } from 'snarkyjs';

// eslint-disable-next-line putout/putout
import type OffchainState from './offchainState';
import type { OffchainStateOptions } from './offchainState';

function propertyKeyToField(propertyKey: string): Field {
  /**
   * Convert the `propertyKey` into an array of
   * UTF-16 code points, which are then converted
   * to Fields.
   */
  const keyFields = propertyKey
    .split('')
    .map((character) => character.codePointAt(0))
    .filter((code): code is number => code !== undefined)
    // eslint-disable-next-line new-cap
    .map((code) => Field(code));

  // compress the entire keyFields into a single hash
  return Poseidon.hash(keyFields);
}

/**
 * Decorate the OffchainState instance with access to
 * the underelying SmartContract, for access to on-chain state
 */
// eslint-disable-next-line etc/no-misused-generics
function offchainState<MapValue>(options?: Readonly<OffchainStateOptions>) {
  return (target: object, propertyKey: string) => {
    // eslint-disable-next-line @typescript-eslint/init-declarations
    let value: OffchainState<MapValue> | undefined;

    // update contract's metadata to include
    // the propertyKey of the decorated property
    const offchainStateKeys: string[] =
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      (Reflect.getMetadata('zkfs:offchainStateKeys', target.constructor) as
        | string[]
        | undefined) ?? [];

    Reflect.defineMetadata(
      'zkfs:offchainStateKeys',
      [...offchainStateKeys, propertyKey],
      target.constructor
    );

    // update the OffchainStorage class with values not available at
    // the time of contract class definition
    function get() {
      if (value) {
        // we call this here since we assume snarky `await isReady;` is finished
        value.key = propertyKeyToField(propertyKey);
        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-invalid-this
        value.contract = this;

        value.contract.events = {
          ...value.contract.events,
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
          [String(value.key.toString())]: value.valueType as any,
        };
      }
      return value;
    }

    Object.defineProperty(target, propertyKey, {
      get,

      // eslint-disable-next-line max-len
      // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
      set: (newValue: OffchainState<MapValue>) => {
        value = newValue;
        if (options) {
          value.options = options;
        }
      },
    });
  };
}

export default offchainState;

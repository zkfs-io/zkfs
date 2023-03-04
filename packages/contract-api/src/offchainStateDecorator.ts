/* eslint-disable @typescript-eslint/no-invalid-this */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/consistent-type-assertions */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import Key from './key.js';
import OffchainState from './offchainState.js';
import type OffchainStateContract from './offchainStateContract.js';
import OffchainStateMap from './offchainStateMap.js';

/**
 * It decorates a property of a class with a getter and setter
 * that sets the key and contract properties of the value to
 * the propertyKey and this, respectively.
 *
 * @returns A function that takes a target and propertyKey
 * and returns a function that takes a target and propertyKey.
 */
function offchainState() {
  return (target: OffchainStateContract, propertyKey: string) => {
    // eslint-disable-next-line @typescript-eslint/init-declarations
    let value: OffchainState<unknown, unknown> | OffchainStateMap | undefined;

    // update contract's metadata to include
    // the propertyKey of the decorated property
    const offchainStateKeys: string[] =
      (Reflect.getMetadata('zkfs:offchainStateKeys', target.constructor) as
        | string[]
        | undefined) ?? [];

    Reflect.defineMetadata(
      'zkfs:offchainStateKeys',
      [...offchainStateKeys, propertyKey],
      target.constructor
    );

    function decorateValue(value: any): any {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      const self = this as any;

      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!value) {
        return value;
      }

      if (value instanceof OffchainStateMap) {
        value.mapName = Key.fromString(propertyKey) as Key<unknown>;
      }

      if (value instanceof OffchainState) {
        value.key = Key.fromString(propertyKey) as Key<unknown>;
      }

      value.contract = self;

      value.parent = (self as OffchainStateContract).root;

      return value;
    }

    Object.defineProperty(target, propertyKey, {
      /**
       * If the value is an OffchainState or OffchainStateMap,
       * then set the key and contract properties of the value
       * to the propertyKey and this, respectively.
       *
       * @returns The value of the property.
       */
      get() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return decorateValue.bind(this)(value);
      },

      set(newValue: OffchainState<unknown, unknown> | OffchainStateMap) {
        value = decorateValue.bind(this)(newValue);
      },
    });
  };
}

export default offchainState;

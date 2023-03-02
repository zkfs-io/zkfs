/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import Key from './key.js';
import OffchainState from './offchainState.js';
import type OffchainStateContract from './offchainStateContract.js';
import OffchainStateMap from './offchainStateMap.js';

/**
 * It's a decorator that adds a property to a class,
 * and that property is an instance of `OffchainState` or `OffchainStateMap`
 *
 * @returns A decorator function
 */
// eslint-disable-next-line etc/no-misused-generics
function offchainState<MapValue>() {
  return (target: OffchainStateContract, propertyKey: string) => {
    // eslint-disable-next-line @typescript-eslint/init-declarations
    let value: OffchainState<unknown, MapValue> | OffchainStateMap | undefined;

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

    Object.defineProperty(target, propertyKey, {
      /**
       * If the value is an OffchainState or OffchainStateMap,
       * then set the key and contract properties of the value
       * to the propertyKey and this, respectively.
       *
       * @returns The value of the property.
       */
      get() {
        if (!value) {
          return value;
        }

        if (value instanceof OffchainStateMap) {
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          value.mapName = Key.fromString(propertyKey) as Key<unknown>;
        }

        if (value instanceof OffchainState) {
          // eslint-disable-next-line max-len
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          value.key = Key.fromString(propertyKey) as Key<unknown>;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        value.contract = this;

        // eslint-disable-next-line max-len
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        value.parent = (this as OffchainStateContract).root;

        // register an event here as well

        return value;
      },

      set(newValue: OffchainState<unknown, MapValue> | OffchainStateMap) {
        value = newValue;
      },
    });
  };
}

export default offchainState;

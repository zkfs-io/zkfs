/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable max-len */
import Key from './key.js';

interface OffchainStateKeys {
  name?: string;
  keys: unknown[];
  maps: OffchainStateKeys[];
}

interface MapKeyData {
  mapName: string;
  key: string;
  isValue: boolean;
}

/**
 * This function recursively traverses OffchainStateKeys representing a state and returns an
 * array of map key combinations.
 *
 * @param {OffchainStateKeys} state - The `state` parameter is an object of type `OffchainStateKeys`,
 * which contains information about the keys and maps in an off-chain state.
 *
 * @returns an array of objects, where each object represents a key-value pair in a nested map
 * structure.
 */
function getMapKeyData(state: OffchainStateKeys): MapKeyData[] {
  const result: { mapName: string; key: string; isValue: boolean }[] = [];

  // eslint-disable-next-line @typescript-eslint/no-shadow
  function traverse(state: OffchainStateKeys, parentName?: string) {
    const currentName = state.name ?? 'root';

    if (parentName !== undefined) {
      result.push({
        mapName: Key.fromString(parentName).toString(),
        key: Key.fromString(currentName).toString(),
        isValue: false,
      });
    }
    state.keys.forEach((key) => {
      // eslint-disable-next-line @typescript-eslint/init-declarations
      let transformedKey;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const valueType = Object.getPrototypeOf(key).constructor;
      if (valueType === 'string') {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        transformedKey = Key.fromString(key as string).toString();
      } else {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-member-access
        if (!valueType.toFields || !valueType.fromFields) {
          throw new Error('wrong key type');
        }
        transformedKey = Key.fromType<typeof valueType>(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          valueType,
          key
        ).toString();
      }

      result.push({
        mapName: Key.fromString(currentName).toString(),
        key: transformedKey,
        isValue: true,
      });
    });

    state.maps.forEach((map) => {
      traverse(map, currentName);
    });
  }

  traverse(state);
  return result;
}

export type { OffchainStateKeys };
export { getMapKeyData };

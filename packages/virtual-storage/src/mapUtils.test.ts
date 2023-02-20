/* eslint-disable new-cap */
import { Field, isReady, MerkleMap } from 'snarkyjs';

import { serializeMap, deserializeMap } from './mapUtils.js';

describe('mapUtils', () => {
  beforeAll(async () => {
    await isReady;
  });

  describe('deserializeMap', () => {
    it('should deserialize the given serialized map', () => {
      expect.assertions(2);

      const originalMap = new MerkleMap();

      originalMap.set(Field(0), Field(10));

      const serializedMap = serializeMap(originalMap);
      const deserializedMap = deserializeMap(serializedMap);

      const value = deserializedMap.get(Field(0));
      deserializedMap.set(Field(1), Field(20));

      const secondValue = deserializedMap.get(Field(1));

      expect(value.toString()).toBe(Field(10).toString());
      expect(secondValue.toString()).toBe(Field(20).toString());
    });
  });
});

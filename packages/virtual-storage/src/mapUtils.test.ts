/* eslint-disable new-cap */
import { Field, isReady, MerkleMap } from 'snarkyjs';

import { serializeMap, deserializeMap, serializeWitness, deserializeWitness } from './mapUtils.js';

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

  describe('deserializeWitness', () => {
    it('should deserialize the given serialized witness', () => {
      expect.assertions(3);

      const originalMap = new MerkleMap();
      const originalKey = Field(5);
      const originalValue = Field(10);
      originalMap.set(originalKey, originalValue);
      originalMap.set(Field(0), Field(3));

      const witness = originalMap.getWitness(originalKey);
      const serializedWitness = serializeWitness(witness);
      const deserializedWitness = deserializeWitness(serializedWitness);

      const [root, key] = deserializedWitness.computeRootAndKey(originalValue);
      const originalRoot = originalMap.getRoot();
      const [originalRootFromWitness] =
        witness.computeRootAndKey(originalValue);

      expect(originalKey.toString()).toBe(key.toString());
      expect(originalRoot.toString()).toBe(root.toString());
      expect(originalRootFromWitness.toString()).toBe(root.toString());
    });
  })
});

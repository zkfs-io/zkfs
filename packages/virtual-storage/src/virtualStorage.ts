/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { Poseidon, Field, MerkleMap, type MerkleMapWitness } from 'snarkyjs';

import {
  serializeMap,
  deserializeMap,
  serializeWitness,
  deserializeWitness,
} from './mapUtils.js';

type ValueRecord = Record<string, string[] | undefined>;

// serialized witness
type WitnessRecord = Record<string, string | undefined>;

/**
 * Enables contract-api and nodes to process rolling/virtual storage
 * updates during contract execution or event processing.
 */
class VirtualStorage {
  /**
   * This function computes a root from a serialized witness and
   * serialized value
   *
   * @param {string} serializedWitness - A string representing a serialized
   * witness object.
   * @param {string[]} serializedValue - An array of strings representing
   * the serialized values that will be used to compute the root.
   *
   * @returns a string which represents the computed root from the serialized
   * witness and serialized value.
   */
  public static computeRootFromSerializedValueWitness(
    serializedWitness: string,
    serializedValue: string[]
  ): string {
    const witness = deserializeWitness(serializedWitness);

    const valueFields = serializedValue.map((fieldString) =>
      // eslint-disable-next-line new-cap
      Field(fieldString)
    );
    const valueHash = Poseidon.hash(valueFields);

    return witness.computeRootAndKey(valueHash)[0].toString();
  }

  // address -> map name -> serialized map as string
  public maps: {
    [key: string]:
      | {
          [key: string]: string | undefined;
        }
      | undefined;
  } = {};

  // address -> { key: value }
  public data: { [key: string]: ValueRecord | undefined } = {};

  // address -> { key: value }
  public witnesses: { [key: string]: WitnessRecord | undefined } = {};

  // eslint-disable-next-line @typescript-eslint/naming-convention
  public constructor(public config = { useCachedWitnesses: false }) {}

  /**
   * Returns stored data for the given address
   *
   * @param address
   * @returns ValueRecord key-value record of contract data
   */
  public getSerializedData(address: string): ValueRecord {
    return this.data[address] ?? {};
  }

  /**
   * Sets stored serialized data for the given address
   *
   * @param address
   * @returns ValueRecord key-value record of contract data
   */
  public setSerializedData(address: string, data: ValueRecord) {
    this.data[address] = data;
  }

  /**
   * Sets a new stored serialized map for the address
   *
   * @param address
   * @param map new serialized map to store
   */
  public setSerializedMap(address: string, mapName: string, map: string) {
    const maps = this.maps[address] ?? {};
    maps[mapName] = map;
    this.maps[address] = maps;
  }

  /**
   * Returns a serialized map stored for the given address
   *
   * @param address
   * @returns string serialized map for the given address
   */
  public getSerializedMap(
    address: string,
    mapName: string
  ): string | undefined {
    return this.maps[address]?.[mapName];
  }

  /**
   * Returns a deserialized version of the stored serialized merkle map
   * for the given address
   *
   * @param address
   * @returns MerkleMap SnarkyJS MerkleMap for the given address
   */
  public getMap(address: string, mapName: string): MerkleMap {
    const serializedMap = this.getSerializedMap(address, mapName);

    if (serializedMap === undefined) {
      return new MerkleMap();
    }

    return deserializeMap(serializedMap);
  }

  public getCombinedKey(mapName: string, key: string): string {
    return `${mapName}-${key}`;
  }

  /**
   * Returns a serialized array of fields (as strings), representing
   * the value stored for the given address and key.
   *
   * @param address
   * @param key
   * @returns string[] serialized value stored for the given address and key
   */
  public getSerializedValue(
    address: string,
    mapName: string,
    key: string
  ): string[] | undefined {
    const combinedKey = this.getCombinedKey(mapName, key);
    const data = this.getSerializedData(address);
    return data[combinedKey];
  }

  /**
   * Returns a value for the given address and key, in a form of a Field array.
   *
   * @param address
   * @param key
   * @returns Field[]
   */
  public getValue(
    address: string,
    mapName: string,
    key: string
  ): Field[] | undefined {
    const serializedValue = this.getSerializedValue(address, mapName, key);

    // eslint-disable-next-line new-cap
    return serializedValue?.map((partOfValue) => Field(partOfValue));
  }

  /**
   * Returns a full SnarkyJS MerkleMapWitness for the given key,
   * created by deserializing the map stored for the given address.
   *
   * @param address
   * @param key
   * @returns MerkleMapWitness
   */
  // eslint-disable-next-line max-statements
  public getWitness(
    address: string,
    mapName: string,
    key: string
  ): MerkleMapWitness {
    // eslint-disable-next-line @typescript-eslint/init-declarations
    let witness: MerkleMapWitness | undefined;

    if (this.config.useCachedWitnesses) {
      witness = this.getDeserializedCachedWitness(address, mapName, key);
    }

    if (witness) {
      return witness;
    }

    // if no cached witness was found, we need to compute it
    const map = this.getMap(address, mapName);
    witness ??= map.getWitness(
      // eslint-disable-next-line new-cap
      Field(key)
    );

    // save computed witness to cache
    if (this.config.useCachedWitnesses) {
      const serializedWitness = serializeWitness(witness);
      this.setSerializedWitness(address, mapName, key, serializedWitness);
    }

    return witness;
  }

  /**
   * This function returns the serialized witnesses for a
   * given address or an empty object if none exist.
   *
   * @param {string} address
   *
   * @returns a WitnessRecord object for the given address.
   */
  public getSerializedWitnesses(address: string): WitnessRecord {
    return this.witnesses[address] ?? {};
  }

  public getSerializedCachedWitness(
    address: string,
    mapName: string,
    key: string
  ): string | undefined {
    const witnesses = this.getSerializedWitnesses(address);
    const combinedKey = this.getCombinedKey(mapName, key);
    return witnesses[combinedKey];
  }

  public getDeserializedCachedWitness(
    address: string,
    mapName: string,
    key: string
  ): MerkleMapWitness | undefined {
    const serializedWitness: string | undefined =
      this.getSerializedCachedWitness(address, mapName, key);

    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    return serializedWitness
      ? deserializeWitness(serializedWitness)
      : undefined;
  }

  /**
   * Updates the stored serialized merkle map with the new value,
   * while also storing the serialized value itself.
   *
   * @param address
   * @param key
   * @param value
   */
  // eslint-disable-next-line max-params
  public setSerializedValue(
    address: string,
    mapName: string,
    key: string,
    value: string[]
  ): void {
    const data = this.getSerializedData(address);
    const map = this.getMap(address, mapName);

    // store the hash of the value in the merkle tree
    // eslint-disable-next-line new-cap
    const valueFields = value.map((fieldString) => Field(fieldString));
    const valueHash = Poseidon.hash(valueFields);

    // eslint-disable-next-line new-cap
    map.set(Field(key), valueHash);
    this.setSerializedMap(address, mapName, serializeMap(map));

    const combinedKey = this.getCombinedKey(mapName, key);

    // store the actual value as string-fields
    const newData: ValueRecord = {
      ...data,
      [combinedKey]: value,
    };

    this.setSerializedData(address, newData);
  }

  /**
   * Sets a value for the given address and key, but serializes the provided
   * value to string[]
   *
   * @param address
   * @param key
   * @param value
   */
  // eslint-disable-next-line max-params
  public setValue(
    address: string,
    mapName: string,
    key: string,
    value: Field[]
  ): void {
    const serializedValue = value.map((field) => field.toString());
    this.setSerializedValue(address, mapName, key, serializedValue);
  }

  // eslint-disable-next-line max-params
  public setSerializedWitness(
    address: string,
    mapName: string,
    key: string,
    serializedWitness: string
  ): void {
    const witnesses = this.getSerializedWitnesses(address);
    const combinedKey = this.getCombinedKey(mapName, key);
    witnesses[combinedKey] = serializedWitness;
  }

  /**
   * Returns a root hash computed by deserializing the MerkleMap
   * stored for the given address
   *
   * @param address
   * @returns string root hash of the map for the given address
   */
  public getRoot(address: string, mapName: string): string | undefined {
    const map = this.getMap(address, mapName);
    return map.getRoot().toString();
  }
}

export default VirtualStorage;

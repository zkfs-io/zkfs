/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import { Poseidon, Field, MerkleMap, type MerkleMapWitness } from 'snarkyjs';

import { serializeMap, deserializeMap } from './mapUtils.js';

type ValueRecord = Record<string, string[] | undefined>;

/**
 * Enables contract-api and nodes to process rolling/virtual storage
 * updates during contract execution or event processing.
 */
class VirtualStorage {
  // address -> serialized map as string
  public maps: { [key: string]: string | undefined } = {};

  // address -> { key: value }
  public data: { [key: string]: ValueRecord | undefined } = {};

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
  public setSerializedMap(address: string, map: string) {
    this.maps[address] = map;
  }

  /**
   * Returns a serialized map stored for the given address
   *
   * @param address
   * @returns string serialized map for the given address
   */
  public getSerializedMap(address: string): string | undefined {
    return this.maps[address];
  }

  /**
   * Returns a deserialized version of the stored serialized merkle map
   * for the given address
   *
   * @param address
   * @returns MerkleMap SnarkyJS MerkleMap for the given address
   */
  public getMap(address: string): MerkleMap {
    const serializedMap = this.getSerializedMap(address);

    if (serializedMap === undefined) {
      return new MerkleMap();
    }

    return deserializeMap(serializedMap);
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
    key: string
  ): string[] | undefined {
    const data = this.getSerializedData(address);
    return data[key];
  }

  /**
   * Returns a value for the given address and key, in a form of a Field array.
   *
   * @param address
   * @param key
   * @returns Field[]
   */
  public getValue(address: string, key: string): Field[] | undefined {
    const serializedValue = this.getSerializedValue(address, key);
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
  public getWitness(address: string, key: string): MerkleMapWitness {
    const map = this.getMap(address);

    // tree only stores hashed values, we can retrieve the witness by a key
    // eslint-disable-next-line new-cap
    return map.getWitness(Field(key));
  }

  /**
   * Updates the stored serialized merkle map with the new value,
   * while also storing the serialized value itself.
   *
   * @param address
   * @param key
   * @param value
   */
  public setSerializedValue(
    address: string,
    key: string,
    value: string[]
  ): void {
    const data = this.getSerializedData(address);
    const map = this.getMap(address);

    // store the hash of the value in the merkle tree
    // eslint-disable-next-line new-cap
    const valueFields = value.map((fieldString) => Field(fieldString));
    const valueHash = Poseidon.hash(valueFields);

    // eslint-disable-next-line new-cap
    map.set(Field(key), valueHash);
    this.setSerializedMap(address, serializeMap(map));

    // store the actual value as string-fields
    const newData: ValueRecord = {
      ...data,
      [key]: value,
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
  public setValue(address: string, key: string, value: Field[]): void {
    const serializedValue = value.map((field) => field.toString());
    this.setSerializedValue(address, key, serializedValue);
  }

  /**
   * Returns a root hash computed by deserializing the MerkleMap
   * stored for the given address
   *
   * @param address
   * @returns string root hash of the map for the given address
   */
  public getRoot(address: string): string | undefined {
    const map = this.getMap(address);
    return map.getRoot().toString();
  }
}

export default VirtualStorage;

/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import {
  Poseidon,
  Field,
  MerkleMap,
  type MerkleMapWitness,
  type PublicKey,
} from 'snarkyjs';

type ValueRecord = Record<string, string[]>;

class VirtualStorage {
  public maps: { [key: string]: MerkleMap | undefined } = {};

  public data: { [key: string]: ValueRecord | undefined } = {};

  public mapDataByAddress(
    address: string
  ): [MerkleMap | undefined, ValueRecord | undefined] {
    // data is namespaced by contract address
    const map = this.maps[address];
    const data = this.data[address];

    return [map, data];
  }

  public get(
    address: Readonly<PublicKey>,
    key: Field
  ): [Field[], MerkleMapWitness] {
    const addressBase58 = address.toBase58();
    const [map, data] = this.mapDataByAddress(addressBase58);
    const keyString = key.toString();

    if (!data) {
      throw new Error(`Data not found for address: ${addressBase58}`);
    }

    if (!map) {
      throw new Error(`MerkleMap not found for address: ${addressBase58}`);
    }

    // raw values are stored under 'data'
    // eslint-disable-next-line  new-cap
    const value = data[keyString].map((fieldString) => Field(fieldString));

    // tree only stores hashed values, we can retrieve the witness by a key
    const witness = map.getWitness(key);
    return [value, witness];
  }

  public set(address: Readonly<PublicKey>, key: Field, value: Field[]): void {
    const addressBase58 = address.toBase58();
    let [map, data] = this.mapDataByAddress(addressBase58);
    const keyString = key.toString();

    // initialise map & data, in case it doesnt exist yet
    map ??= new MerkleMap();
    data ??= {};

    // store the hash of the value in the merkle tree
    const valueHash = Poseidon.hash(value);
    map.set(key, valueHash);
    this.maps[addressBase58] = map;

    // store the actual value as string-fields
    const newData: ValueRecord = {
      ...data,
      [String(keyString)]: value.map((field) => field.toString()),
    };

    this.data[addressBase58] = newData;
  }

  public getRoot(address: Readonly<PublicKey>): Field | undefined {
    const [map] = this.mapDataByAddress(address.toBase58());
    return map?.getRoot();
  }
}

export default VirtualStorage;

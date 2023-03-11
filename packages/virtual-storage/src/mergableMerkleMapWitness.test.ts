// /* eslint-disable max-statements */
// /* eslint-disable jest/require-hook */
// /* eslint-disable new-cap */
// import {
//   Bool,
//   Circuit,
//   CircuitValue,
//   Field,
//   isReady,
//   MerkleWitness,
//   Poseidon,
//   MerkleTree,
//   MerkleMap,
// } from 'snarkyjs';
// import { mergeMerkleMapWitnesses } from './mergableMerkleMapWitness.js';

// await isReady;

// declare type Witness = {
//   isLeft: boolean;
//   sibling: Field;
// }[];

// declare class BaseMerkleWitness extends CircuitValue {
//   static height: number;
//   path: Field[];
//   isLeft: Bool[];
//   height(): number;
//   /**
//    * Takes a {@link Witness} and turns it into a circuit-compatible Witness.
//    * @param witness Witness.
//    * @returns A circuit-compatible Witness.
//    */
//   constructor(witness: Witness);
//   /**
//    * Calculates a root depending on the leaf value.
//    * @param leaf Value of the leaf node that belongs to this Witness.
//    * @returns The calculated root.
//    */
//   calculateRoot(leaf: Field): Field;
//   /**
//    * Calculates the index of the leaf node that belongs to this Witness.
//    * @returns Index of the leaf.
//    */
//   calculateIndex(): Field;
// }

// class MyMerkleWitness extends MerkleWitness(255 + 1) {
//   // TODO: add merge to the prototype of the class we want to extend from snarkyjs, so that we dont have to fork snarky / make a PR
//   public merge(leaf: Field, other: BaseMerkleWitness): Witness {
//     const otherHeight = other.height();
//     if (this.height() !== otherHeight) {
//       throw Error('witnesses of different height are not mergable');
//     }

//     const index = Number(this.calculateIndex().toString());
//     const otherIndex = Number(other.calculateIndex().toString());

//     let levelWithDivergance: number = 0;
//     let x = 2 ** (this.height() - 1) / 2;
//     for (let i = 1; i < this.height(); i++) {
//       const bothUpperHalf = index > x && otherIndex > x;
//       const bothLowerHalf = index <= x && otherIndex <= x;

//       if (bothUpperHalf) {
//         x = x + x / 2;
//       } else if (bothLowerHalf) {
//         x = x / 2;
//       } else {
//         levelWithDivergance = this.height() - i;
//       }
//     }

//     // calculate hash just a bit...
//     let hash = leaf;
//     for (let i = 0; i < levelWithDivergance; ++i) {
//       const left = Circuit.if(other.isLeft[i], hash, other.path[i]);
//       const right = Circuit.if(other.isLeft[i], other.path[i], hash);
//       hash = Poseidon.hash([left, right]);
//     }

//     const newWitness: Witness = this.isLeft.map((isLeft, i) => {
//       return {
//         isLeft: isLeft.toBoolean(),
//         sibling: this.path[i],
//       };
//     });
//     newWitness[levelWithDivergance].sibling = hash;
//     return newWitness;
//   }
// }

// describe('test', () => {
//   it('test', () => {
//     expect.assertions(0);

//     const map1 = new MerkleMap();

//     map1.set(Field(0), Field(0));
//     map1.set(Field(1), Field(1));
//     map1.set(Field(2), Field(2));

//     map1.set(Field(0), Field(111));
//     map1.set(Field(1), Field(222));

//     const root1 = map1.getRoot();

//     const map1index0 = map1._keyToIndex(Field(0));
//     console.log('map1 index0', map1index0.toString());

//     const map1index1 = map1._keyToIndex(Field(1));
//     console.log('map1 index1', map1index1.toString());

//     console.log('root1', root1.toString());

//     const map2 = new MerkleMap();
//     map2.set(Field(0), Field(0));
//     map2.set(Field(1), Field(1));
//     map2.set(Field(2), Field(2));

//     // const w0 = map2.getWitness(Field(0));
//     // const w1 = map2.getWitness(Field(1));

//     // const w0Updated = mergeMerkleMapWitnesses(w0, Field(222), w1);

//     // console.log('root2', w0Updated.computeRootAndKey(Field(111))[0].toString());

//     const index0 = map2._keyToIndex(Field(0));
//     console.log('map2 index0', index0.toString());
//     const w0 = new MyMerkleWitness(map2.tree.getWitness(index0));

//     const index1 = map2._keyToIndex(Field(1));
//     console.log('map2 index1', index1.toString());
//     const w1 = new MyMerkleWitness(map2.tree.getWitness(index1));

//     console.log('map2 root', map2.getRoot().toString());

//     console.log('w1 root', w1.calculateRoot(Field(1)).toString());

//     const w0Updated = new MyMerkleWitness(w0.merge(Field(222), w1));
//     const newRoot = w0Updated.calculateRoot(Field(111));
//     console.log('newRoot', newRoot.toString());
//   });
// });

/**
 * _______ TREE TEST ________
 */

import {
  Bool,
  Circuit,
  CircuitValue,
  Field,
  isReady,
  MerkleWitness,
  Poseidon,
  MerkleTree,
  MerkleMap,
  UInt64,
} from 'snarkyjs';

await isReady;

declare type Witness = {
  isLeft: boolean;
  sibling: Field;
}[];

declare class BaseMerkleWitness extends CircuitValue {
  static height: number;
  path: Field[];
  isLeft: Bool[];
  height(): number;
  /**
   * Takes a {@link Witness} and turns it into a circuit-compatible Witness.
   * @param witness Witness.
   * @returns A circuit-compatible Witness.
   */
  constructor(witness: Witness);
  /**
   * Calculates a root depending on the leaf value.
   * @param leaf Value of the leaf node that belongs to this Witness.
   * @returns The calculated root.
   */
  calculateRoot(leaf: Field): Field;
  /**
   * Calculates the index of the leaf node that belongs to this Witness.
   * @returns Index of the leaf.
   */
  calculateIndex(): Field;
}

class MyMerkleWitness extends MerkleWitness(256) {
  merge(leaf: Field, other: BaseMerkleWitness): Witness {
    const otherHeight = other.height();
    if (this.height() !== otherHeight) {
      throw Error('witnesses of different height are not mergable');
    }

    const index = Number(this.calculateIndex().toString());
    const otherIndex = Number(other.calculateIndex().toString());

    let levelWithDivergance: number = 0;
    let x = 2 ** (this.height() - 1) / 2;
    for (let i = 1; i < this.height(); i++) {
      const bothUpperHalf = index > x && otherIndex > x;
      const bothLowerHalf = index <= x && otherIndex <= x;

      if (bothUpperHalf) {
        x = x + x / 2;
      } else if (bothLowerHalf) {
        x = x / 2;
      } else {
        levelWithDivergance = this.height() - i;
      }
    }

    // calculate hash just a bit...
    let hash = leaf;
    for (let i = 0; i < levelWithDivergance; ++i) {
      const left = Circuit.if(other.isLeft[i], hash, other.path[i]);
      const right = Circuit.if(other.isLeft[i], other.path[i], hash);
      hash = Poseidon.hash([left, right]);
    }

    const newWitness: Witness = this.isLeft.map((isLeft, i) => {
      return {
        isLeft: isLeft.toBoolean(),
        sibling: this.path[i],
      };
    });
    newWitness[levelWithDivergance].sibling = hash;
    return newWitness;
  }
}

// map is used only to access _keyToIndex
const map = new MerkleMap();
// alias _keyToIndex to determine indexes from keys/fields
const k = map._keyToIndex;

console.log('0', k(Field(0)));
console.log('1', k(UInt64.MAXINT().value.mul(5)));

// tree with the same height as MerkleMap should have internally
let tree = new MerkleTree(256);
tree.setLeaf(k(Field(0)), Field(10));
// changed values
tree.setLeaf(k(Field(1)), Field(100));
tree.setLeaf(k(Field(2)), Field(1000));

Field(0).toBigInt();
// changed values end
tree.setLeaf(k(Field(3)), Field(20));
tree.setLeaf(k(Field(4)), Field(200));
tree.setLeaf(k(Field(5)), Field(2000));
tree.setLeaf(k(Field(6)), Field(30));

tree.setLeaf(k(Field(1)), Field(333));
tree.setLeaf(k(Field(2)), Field(444));

const root = tree.getRoot();

console.log('original root', root.toString());

// new tree
let tree1 = new MerkleTree(256);
tree1.setLeaf(k(Field(0)), Field(10));
// changed values
tree1.setLeaf(k(Field(1)), Field(100));
tree1.setLeaf(k(Field(2)), Field(1000));
// changed values end
tree1.setLeaf(k(Field(3)), Field(20));
tree1.setLeaf(k(Field(4)), Field(200));
tree1.setLeaf(k(Field(5)), Field(2000));
tree1.setLeaf(k(Field(6)), Field(30));

const root1 = tree1.getRoot();

console.log('original root1', root1.toString());

const w1 = new MyMerkleWitness(tree1.getWitness(k(Field(1))));
const w2 = new MyMerkleWitness(tree1.getWitness(k(Field(2))));

// this matches root1 as expected
console.log('w1 original root1', w1.calculateRoot(Field(100)).toString());
console.log('w2 original root1', w2.calculateRoot(Field(1000)).toString());

// Field(2) = Field(444) in our map/tree concept
const updatedW1 = new MyMerkleWitness(w1.merge(Field(444), w2));
// Field(1) = Field(333)
const updatedW1Root = updatedW1.calculateRoot(Field(333));

console.log('updatedW1Root', updatedW1Root.toString());

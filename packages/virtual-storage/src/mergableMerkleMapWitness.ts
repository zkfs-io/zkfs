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
  MerkleMapWitness,
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

const bits = 255;
class MergableMerkleWitness extends MerkleWitness(bits + 1) {
  // TODO: add merge to the prototype of the class we want to extend from snarkyjs, so that we dont have to fork snarky / make a PR
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

const merkleMapWitnessToWitness = (
  merkleMapWitness: MerkleMapWitness
): Witness => {
  // original MerkleMapWitness
  const { siblings, isLefts } = merkleMapWitness;

  // turn it back into the original tree witness
  // you get this from tree.getWitness(...)
  const reconstructedWitness: Witness = siblings.reduce<Witness>(
    (witness, sibling, index) => {
      witness.push({
        isLeft: isLefts[index].toBoolean(),
        sibling: sibling,
      });

      return witness;
    },
    []
  );

  return reconstructedWitness;
};

export const mergeMerkleMapWitnesses = (
  mergeIntoMerkleMapWitness: MerkleMapWitness,
  value: Field,
  otherMerkleMapWitness: MerkleMapWitness
): MerkleMapWitness => {
  // turn current MerkleMapWitness into MergableMerkleWitness

  // returned from the underlying tree
  const selfReconstructedWitness = merkleMapWitnessToWitness(
    mergeIntoMerkleMapWitness
  );

  // turned into a tree-ish mergable witness
  const selfMergableWitness = new MergableMerkleWitness(
    selfReconstructedWitness
  );

  // turn the other MerkleMapWitness into a MergableMerkleWitness
  const otherReconstructedWitness = merkleMapWitnessToWitness(
    otherMerkleMapWitness
  );
  const otherMergableWitness = new MergableMerkleWitness(
    otherReconstructedWitness
  );

  // merge two mergable witnesses
  const mergedRawWitness = selfMergableWitness.merge(
    value,
    otherMergableWitness
  );

  const mergedMergableWitness = new MergableMerkleWitness(mergedRawWitness);

  return new MerkleMapWitness(
    mergedMergableWitness.isLeft,
    mergedMergableWitness.path
  );
};

export interface MergableMerkleMapWitness {
  merge: (
    value: Field,
    otherMerkleMapWitness: MerkleMapWitness
  ) => MerkleMapWitness;
}

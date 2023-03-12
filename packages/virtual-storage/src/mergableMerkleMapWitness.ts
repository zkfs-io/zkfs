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

function sharedDepthTopToBottom(ownPath: Bool[], otherPath: Bool[]) {
  if (ownPath.length !== otherPath.length) {
    throw new Error('Both paths need to be of same length');
  }

  const reversedOwnPath = ownPath.slice().reverse();
  const reversedOtherPath = otherPath.slice().reverse();

  const { length } = ownPath;

  for (let index = 0; index < length; index++) {
    const ownValue = reversedOwnPath[index].toBoolean();
    const otherValue = reversedOtherPath[index].toBoolean();

    if (ownValue !== otherValue) {
      return index;
    }
  }

  return length;
}

const bits = 255;
class MergableMerkleWitness extends MerkleWitness(bits + 1) {
  merge(leaf: Field, other: BaseMerkleWitness): Witness {
    const otherHeight = other.height();
    if (this.height() !== otherHeight) {
      throw Error('witnesses of different height are not mergable');
    }
    const sharedDepth = sharedDepthTopToBottom(this.isLeft, other.isLeft);

    const witness: Witness = this.isLeft.map((isLeft, i) => {
      return {
        isLeft: isLeft.toBoolean(),
        sibling: this.path[i],
      };
    });

    if (sharedDepth === this.path.length) {
      return witness;
    }

    console.log('sharedDepth', sharedDepth);
    const replaceAtIndex = this.isLeft.length - sharedDepth - 1;

    let hash = leaf;
    // rebuild by hashing bottom to top in other path
    for (let level = 0; level < replaceAtIndex; level++) {
      const isLeft = other.isLeft[level].toBoolean();

      const left = isLeft ? hash : other.path[level];
      const right = isLeft ? other.path[level] : hash;

      hash = Poseidon.hash([left, right]);
    }

    
    witness[replaceAtIndex].sibling = hash; 

    return witness;
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

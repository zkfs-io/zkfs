/* eslint-disable new-cap */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable sort-class-members/sort-class-members */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
/* eslint-disable max-classes-per-file */
/**
 * It was necessary to disable "@shopify/prefer-class-properties" rule
 * in .eslintrc. Workarounds have not worked to fix the issue. Even if
 * the rule was disabled just for this file.
 */
import {
  type Bool,
  CircuitValue,
  type Field,
  isReady,
  MerkleWitness,
  Poseidon,
  MerkleMapWitness,
} from 'snarkyjs';

await isReady;

declare type Witness = {
  isLeft: boolean;
  sibling: Field;
}[];

// eslint-disable-next-line etc/no-deprecated
declare class BaseMerkleWitness extends CircuitValue {
  static height: number;

  path: Field[];

  isLeft: Bool[];
  height(): number;

  constructor(witness: Witness);

  calculateRoot(leaf: Field): Field;

  calculateIndex(): Field;
}

// eslint-disable-next-line max-statements
function sharedDepthTopToBottom(ownPath: Bool[], otherPath: Bool[]) {
  if (ownPath.length !== otherPath.length) {
    throw new Error('Both paths need to be of same length');
  }

  const reversedOwnPath = ownPath.slice().reverse();
  const reversedOtherPath = otherPath.slice().reverse();

  const { length } = ownPath;

  for (let index = 0; index < length; index += 1) {
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
  // eslint-disable-next-line max-statements
  merge(leaf: Field, other: BaseMerkleWitness): Witness {
    const otherHeight = other.height();
    if (this.height() !== otherHeight) {
      throw new Error('witnesses of different height are not mergable');
    }
    const sharedDepth = sharedDepthTopToBottom(this.isLeft, other.isLeft);

    const witness: Witness = this.isLeft.map((isLeft, index) => ({
      isLeft: isLeft.toBoolean(),
      sibling: this.path[index],
    }));

    if (sharedDepth === this.path.length) {
      return witness;
    }

    const replaceAtIndex = this.isLeft.length - sharedDepth - 1;

    // eslint-disable-next-line putout/putout
    let hash = leaf;

    // rebuild by hashing bottom to top in other path
    for (let level = 0; level < replaceAtIndex; level += 1) {
      const isLeft = other.isLeft[level].toBoolean();

      const left = isLeft ? hash : other.path[level];
      const right = isLeft ? other.path[level] : hash;

      hash = Poseidon.hash([left, right]);
    }

    witness[replaceAtIndex].sibling = hash;

    return witness;
  }
}

function merkleMapWitnessToWitness(
  merkleMapWitness: MerkleMapWitness
): Witness {
  // original MerkleMapWitness
  // eslint-disable-next-line putout/putout
  const { siblings, isLefts } = merkleMapWitness;

  // turn it back into the original tree witness
  // you get this from tree.getWitness(...)
  const reconstructedWitness: Witness = siblings.reduce<Witness>(
    (witness, sibling, index) => {
      witness.push({
        isLeft: isLefts[index].toBoolean(),
        sibling,
      });

      return witness;
    },
    []
  );

  return reconstructedWitness;
}

function mergeMerkleMapWitnesses(
  mergeIntoMerkleMapWitness: MerkleMapWitness,
  value: Field,
  otherMerkleMapWitness: MerkleMapWitness
): MerkleMapWitness {
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
}

export interface MergableMerkleMapWitness {
  merge: (
    value: Field,
    otherMerkleMapWitness: MerkleMapWitness
  ) => MerkleMapWitness;
}

export { mergeMerkleMapWitnesses };

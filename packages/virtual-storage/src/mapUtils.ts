import { Field, MerkleMap } from 'snarkyjs';

interface SerializableTree {
  nodes: Record<number, Record<string, Field>>;
  zeroes: Field[];
}

interface SerializedTree {
  nodes: Record<number, Record<string, string>>;
  zeroes: string[];
}

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
function serializeMap(map: MerkleMap): string {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const tree = map.tree as unknown as SerializableTree;

  const zeroes = tree.zeroes.map<string>((zero) => zero.toString());
  const nodes = Object.entries(tree.nodes).reduce<SerializedTree['nodes']>(
    // eslint-disable-next-line @typescript-eslint/no-shadow
    (nodes, [key, value]) => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const keyNumber = key as unknown as number;
      const childNodes = Object.entries(value);
      // eslint-disable-next-line no-param-reassign
      nodes[keyNumber] = childNodes.reduce<Record<string, string>>(
        // eslint-disable-next-line @typescript-eslint/no-shadow
        (nestedValue, [key, value]) => {
          // eslint-disable-next-line no-param-reassign
          nestedValue[key] = value.toString();
          return nestedValue;
        },
        {}
      );
      return nodes;
    },
    {}
  );

  const serializedTree: SerializedTree = {
    nodes,
    zeroes,
  };

  return JSON.stringify(serializedTree);
}

function deserializeMap(serializedTree: string): MerkleMap {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const tree = JSON.parse(serializedTree) as SerializedTree;
  const map = new MerkleMap();

  // eslint-disable-next-line new-cap, putout/putout
  const zeroes = tree.zeroes.map<Field>((zero) => Field(zero));
  // eslint-disable-next-line putout/putout
  const nodes = Object.entries(tree.nodes).reduce<SerializableTree['nodes']>(
    // eslint-disable-next-line @typescript-eslint/no-shadow
    (nodes, [key, value]) => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
      const keyNumber = key as unknown as number;
      const childNodes = Object.entries(value);
      // eslint-disable-next-line no-param-reassign
      nodes[keyNumber] = childNodes.reduce<Record<string, Field>>(
        // eslint-disable-next-line @typescript-eslint/no-shadow
        (nestedValue, [key, value]) => {
          // eslint-disable-next-line no-param-reassign, new-cap
          nestedValue[key] = Field(value);
          return nestedValue;
        },
        {}
      );
      return nodes;
    },
    {}
  );

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  (map.tree as unknown as SerializableTree).nodes = nodes;
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  (map.tree as unknown as SerializableTree).zeroes = zeroes;

  return map;
}

export { serializeMap, deserializeMap };

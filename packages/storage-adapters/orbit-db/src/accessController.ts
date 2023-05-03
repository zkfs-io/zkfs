/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
import AccessControllers from 'orbit-db-access-controllers';
import type OrbitDB from 'orbit-db';
import { VirtualStorage } from '@zkfs/virtual-storage';

// eslint-disable-next-line import/no-relative-packages
import type { ConsensusBridge } from '../../../node/src/interface.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
const { AccessController } = AccessControllers;

const type = 'zkfs-beta';
const rootMap =
  '26066477330778984202216424320685767887570180679420406880153508397309006440830';

interface Data {
  address: string;
  mapName: string;
  keyInMap: string;
  value: string[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractData(entry: LogEntry<any>): Data {
  // eslint-disable-next-line putout/putout
  const { id, payload } = entry;
  // eslint-disable-next-line @typescript-eslint/no-magic-numbers
  const address = id.split('.').at(-1) ?? '';
  const { key } = payload;
  if (key === undefined) {
    throw new Error('key is undefined');
  }
  const [mapName, keyInMap] = key.split('-');
  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
  const value: string[] = JSON.parse(payload.value);

  return {
    address,
    mapName,
    keyInMap,
    value,
  };
}

class ZkfsAccessController extends AccessController {
  public static virtualStorage: VirtualStorage;

  public static consensus: ConsensusBridge;

  public static get type() {
    return type;
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public static async create(orbitdb: OrbitDB, options = {}) {
    return new ZkfsAccessController(orbitdb, options);
  }

  public virtualStorageInstance: VirtualStorage;

  public consensus: ConsensusBridge;

  // eslint-disable-next-line max-len
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  public constructor(public orbitdb: OrbitDB, options: any) {
    super();
    this.virtualStorageInstance = ZkfsAccessController.virtualStorage;
    this.consensus = ZkfsAccessController.consensus;
  }

  public async canAppend(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entry: LogEntry<any>
  ): Promise<boolean> {
    const { address, mapName, keyInMap, value } = extractData(entry);

    const witness = this.virtualStorageInstance.getSerializedWitness(
      address,
      mapName,
      keyInMap
    );
    let computedRoot = VirtualStorage.computeRootFromSerializedValueWitness(
      witness,
      value
    );

    if (mapName !== rootMap) {
      const rootWitness = this.virtualStorageInstance.getSerializedWitness(
        address,
        rootMap,
        mapName
      );
      computedRoot = VirtualStorage.computeRootFromSerializedValueWitness(
        rootWitness,
        [computedRoot]
      );
    }

    return await this.consensus.verifyComputedRoot(address, computedRoot);
  }
}

export default ZkfsAccessController;

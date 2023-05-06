/* eslint-disable putout/putout */
import { UInt32, isReady } from 'snarkyjs';

import type Events from '../src/types.js';

await isReady;

const piggyBankEvents: Events = [
  {
    events: [
      [
        '2',
        '26066477330778984202216424320685767887570180679420406880153508397309006440830',
        '7784303761164632772807954006177484755146200365757401756120767318151927507806',
        '22731122946631793544306773678309960639073656601863129978322145324846701682624',
      ],
    ],

    blockHeight: UInt32.from(0),
    globalSlot: UInt32.from(0),
    blockHash: '',
    parentBlockHash: '',
    chainStatus: '',
    transactionHash: '',
    transactionStatus: '',
    transactionMemo: '',
  },
  {
    events: [
      [
        '3',
        '26066477330778984202216424320685767887570180679420406880153508397309006440830',
        '7784303761164632772807954006177484755146200365757401756120767318151927507806',
        '2879140883079234083739072433302655428620676912090406234791507627086874611706',
        '10',
      ],
      [
        '2',
        '26066477330778984202216424320685767887570180679420406880153508397309006440830',
        '7784303761164632772807954006177484755146200365757401756120767318151927507806',
        '1501891826259872679521944945100703550916350283654459049036519673697970270597',
      ],
    ],

    blockHeight: UInt32.from(1),
    globalSlot: UInt32.from(0),
    blockHash: '',
    parentBlockHash: '',
    chainStatus: '',
    transactionHash: '',
    transactionStatus: '',
    transactionMemo: '',
  },
  {
    events: [
      [
        '3',
        '26066477330778984202216424320685767887570180679420406880153508397309006440830',
        '7784303761164632772807954006177484755146200365757401756120767318151927507806',
        '2879140883079234083739072433302655428620676912090406234791507627086874611706',
        '20',
      ],
      [
        '2',
        '26066477330778984202216424320685767887570180679420406880153508397309006440830',
        '7784303761164632772807954006177484755146200365757401756120767318151927507806',
        '15652995939756645567645860762559320602568652686684272523493674664648628110962',
      ],
    ],

    blockHeight: UInt32.from(2),
    globalSlot: UInt32.from(0),
    blockHash: '',
    parentBlockHash: '',
    chainStatus: '',
    transactionHash: '',
    transactionStatus: '',
    transactionMemo: '',
  },
];

const piggyBankTestData = {
  events: piggyBankEvents,

  maps: {
    rootMap: {
      name: '26066477330778984202216424320685767887570180679420406880153508397309006440830',
      hash: '12712195414270122468021832258103588809391854996419196976655305721817888838890',
    },

    depositsMap: {
      name: '7784303761164632772807954006177484755146200365757401756120767318151927507806',
      hash: '15652995939756645567645860762559320602568652686684272523493674664648628110962',
    },
  },
};

const counterEvents: Events = [
  {
    events: [
      [
        '2',
        '26066477330778984202216424320685767887570180679420406880153508397309006440830',
        '28605682173273573057610312944779067901696484294421603573649634336161888826727',
        '0',
      ],
    ],

    blockHeight: UInt32.from(0),
    globalSlot: UInt32.from(0),
    blockHash: '',
    parentBlockHash: '',
    chainStatus: '',
    transactionHash: '',
    transactionStatus: '',
    transactionMemo: '',
  },
  {
    events: [
      [
        '2',
        '26066477330778984202216424320685767887570180679420406880153508397309006440830',
        '28605682173273573057610312944779067901696484294421603573649634336161888826727',
        '1',
      ],
    ],

    blockHeight: UInt32.from(1),
    globalSlot: UInt32.from(0),
    blockHash: '',
    parentBlockHash: '',
    chainStatus: '',
    transactionHash: '',
    transactionStatus: '',
    transactionMemo: '',
  },
  {
    events: [
      [
        '2',
        '26066477330778984202216424320685767887570180679420406880153508397309006440830',
        '28605682173273573057610312944779067901696484294421603573649634336161888826727',
        '2',
      ],
    ],

    blockHeight: UInt32.from(2),
    globalSlot: UInt32.from(0),
    blockHash: '',
    parentBlockHash: '',
    chainStatus: '',
    transactionHash: '',
    transactionStatus: '',
    transactionMemo: '',
  },
];

const counterTestData = {
  events: counterEvents,

  maps: {
    rootMap: {
      name: '26066477330778984202216424320685767887570180679420406880153508397309006440830',
      hash: '16101189934576437483060203050538396043608044765542999453470755546101472498933',
    },
  },
};

const concurrentCounterEvents: Events = [
  {
    events: [
      [
        '2',
        '26066477330778984202216424320685767887570180679420406880153508397309006440830',
        '23402912503577835451439776101235707424342461142742967038229275985488249192799',
        '22731122946631793544306773678309960639073656601863129978322145324846701682624',
      ],
    ],

    blockHeight: UInt32.from(0),
    globalSlot: UInt32.from(0),
    blockHash: '',
    parentBlockHash: '',
    chainStatus: '',
    transactionHash: '',
    transactionStatus: '',
    transactionMemo: '',
  },
  {
    events: [
      [
        '3',
        '26066477330778984202216424320685767887570180679420406880153508397309006440830',
        '23402912503577835451439776101235707424342461142742967038229275985488249192799',
        '21565680844461314807147611702860246336805372493508489110556896454939225549736',
        '1',
      ],
      [
        '2',
        '26066477330778984202216424320685767887570180679420406880153508397309006440830',
        '23402912503577835451439776101235707424342461142742967038229275985488249192799',
        '13684270761745286323443050014168876381802199110475928793661435591290283607738',
      ],
    ],

    blockHeight: UInt32.from(2),
    globalSlot: UInt32.from(0),
    blockHash: '',
    parentBlockHash: '',
    chainStatus: '',
    transactionHash: '',
    transactionStatus: '',
    transactionMemo: '',
  },
];

const concurrentCounterTestData = {
  events: concurrentCounterEvents,

  maps: {
    rootMap: {
      name: '26066477330778984202216424320685767887570180679420406880153508397309006440830',
      hash: '3138014170879826030006310572328113958062379230962480118414218841862676058527',
    },

    countersMap: {
      name: '23402912503577835451439776101235707424342461142742967038229275985488249192799',
      hash: '13684270761745286323443050014168876381802199110475928793661435591290283607738'
    }
  },
};

export { counterTestData, piggyBankTestData, concurrentCounterTestData };

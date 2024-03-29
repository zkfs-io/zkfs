---
title: Introducing ZKFS, Mina's native data availability layer
slug: introducing-zkfs-mina-data-availability-layer
authors:
  - maht0rz
hide_table_of_contents: false
---

**Introducing ZKFS _(Zero-Knowledge File System)_ - a data availability layer designed to reduce blockchain storage requirements while still allowing for complex business logic. **

Unlike traditional blockchain designs, MINA's zero-knowledge approach enables developers to store [^1]large data structures indirectly (through state hash commitments) without adding unnecessary bulk to the network. More importantly, it shifts the responsibilities of executing smart-contracts to the client side, together with delegating the data storage requirements outside of the MINA chain itself.

[You can try ZKFS out for yourself on our online playground or locally.](https://zkfs.io)

<!--truncate-->

[^1]: As long as someone is willing to pay for the storage, and someone is willing to store it.\_

Our solution offers a suite of smart-contract libraries, networking utilities, and data consensus tools that allow for the seamless development of smart contracts capable of storing arbitrarily large data structures.

## Why do we need a data availability layer at all?

In the case of "traditional" smart-contract blockchain designs like EVM/Ethereum or Tezos, the business logic of each transaction and its smart contracts are validated directly by the chain itself. To include a smart contract transaction in a block, **the block producer and all other nodes must have access to all the data related to the contract and the other "chain data"** as well. This results in the blockchain growing in size, and [for instance, an Ethereum archive node requires 3-12TB of storage space](https://ethereum.org/en/developers/docs/nodes-and-clients/archive-nodes/#hardware) to run.

**Thanks to the zero-knowledge nature of MINA and the well-designed smart-contract platform, operating a MINA node is expected to be less storage-intensive.** This is especially true when scaling the amount of storage space used to accommodate the deployment of various applications/smart-contracts on the MINA platform.

The MINA network imposes a limitation on the amount of storage space that can be taken per account, allowing only 8 Fields. As a point of reference, a simple public key can be serialized into two Fields, meaning that each account or smart-contract can only store 4 public keys in its on-chain storage. While this restriction may benefit the network and its node operators by maintaining lower storage requirements compared to other blockchains, it presents a challenge for smart-contract development, as complex business logic often requires the storage of arbitrarily large data structures.

**To address this limitation, we have started working on ZKFS** - a solution that provides an intuitive approach for developing smart contracts capable of storing arbitrarily large data structures. ZKFS offers a seamless developer experience, featuring a suite of (snarkyjs-based) libraries, zk-security guarantees, and networking utilities (ZKFS nodes) such as distributed data storage and replication, as well as data validation through built-in consensus mechanisms.

---

## State of ZKFS development today

In February we have begun working on a grant by the Mina Foundation to kickstart the development of ZKFS. This proposal is the next natural step in our journey to make ZKFS the go-to storage solution for MINA's smart-contract developers.

Based on our [initial ideation](https://stove-labs.notion.site/Off-chain-Storage-74a69774288d4b3b80e861a8f10ff73a), we have originally split up the existing ZKFS roadmap into 4 milestones, the first two overall milestones are a part of the existing grant and are mostly done and available today.

First two milestones are pending further review by MF, after the target completion date by the end of March 2023.

## Architecture and fundamental principles

At it's core ZKFS is designed to be feature-permissive, with replacable components/adapters as per the _'substitution principle'_. You can think of ZKFS as a shell, designed to run concrete implementations of its core components.

:::tip
Don't like reading tables? Skip ahead to [the flow diagram](#separation-of-responsibilities-and-conceptual-flow).
:::

### Interchangable component overview

| Component                   | Responsibilities                                                                                                                                  | Available Implementations                                                                                                |
| :-------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------ | :----------------------------------------------------------------------------------------------------------------------- |
| **Node and Light Client**   | —                                                                                                                                                 | [@zkfs/node](https://github.com/zkfs-io/zkfs/tree/feat/zkfs-node/packages/node)                                          |
| Storage                     | Storing, replicating and validating incoming data through consensus                                                                               | [@zkfs/storage-orbit-db](https://github.com/zkfs-io/zkfs/tree/feat/zkfs-node/packages/storage-adapters/orbit-db)         |
| Consensus                   | Validating individual data writes per the desired consensus logic                                                                                 | [WIP] On-chain root hash consensus                                                                                       |
| Services                    | Extending the features available in the ZKFS Node, currently used to provide access to data for light clients                                     | [@zkfs/orbit-db-data-pubsub](https://github.com/zkfs-io/zkfs/tree/feat/zkfs-node/packages/services/orbit-db-data-pubsub) |
| Event parser (working name) | Observing and processing write requests made by the contracts                                                                                     | [WIP] Mina node transaction event parser                                                                                 |
| —                           | —                                                                                                                                                 | —                                                                                                                        |
| **Contract tooling**        | —                                                                                                                                                 | —                                                                                                                        |
| Contract API                | In-contract utilities with full SnarkyJS compatibility, verifying data retrieved from nodes/light clients, emitting data to be processed by nodes | [@zkfs/contract-api](https://www.npmjs.com/package/@zkfs/contract-api)                                                   |
| Virtual storage             | Virtual/rolling storage used to process in-memory data writes, required to ensure data correctness across multiple data writes                    | [@zkfs/virtual-storage](https://www.npmjs.com/package/@zkfs/virtual-storage)                                             |

### Flow diagram & Separation of responsibilities

<iframe width="100%" height="450" src="https://www.figma.com/embed?embed_host=share&url=https%3A%2F%2Fwww.figma.com%2Ffile%2FyuquvCH4kOGTgh0zPXrHEh%2FUntitled%3Fnode-id%3D0%253A1%26t%3DuvoP6lTxmpk1uaC8-1" allowfullscreen></iframe>

## Using ZKFS in smart contracts

Earlier we have described what components make ZKFS possible, now we'll dive into how exactly can a Mina smart contract ~~trust~~ verify the data it receives from ZKFS.

Contract API comes with a set of utilities that make consuming off-chain state in a smart contract a breeze. First of all, it lets you define the shape and structure of your off-chain state,
in a fashion very similiar to on-chain state. This ensures a low learning curve for existing SnarkyJS developers.

:::warning
Having trouble running any of the code snippets below? We keep our reference examples up to date, you can [try them in our online playground](https://stackblitz.com/github/zkfs-io/zkfs?file=packages%2Fexamples%2Ftest%2Fcounter.test.ts,packages%2Fexamples%2Ftest%2Fcounter.ts&hideExplorer=1&hideNavigation=1&theme=dark&view=editor).

Examples in this blog post are valid under the following package releases:

- `@zkfs/contract-api@0.1.9-develop.151`

:::

### Counter example

```typescript title="counter.ts" showLineNumbers
import {
  OffchainStateContract,
  offchainState,
  OffchainState,
} from '@zkfs/contract-api';

import { UInt64 } from 'snarkyjs';

class Counter extends OffchainStateContract {
  // badum-tss, we now have access to off-chain state
  @offchainState() public count = OffchainState.fromRoot<UInt64>(UInt64);

  // runs every time this contract is deployed
  public init() {
    super.init();
    // initialise our 'count' state to 0
    this.count.set(UInt64.from(0));
  }

  // anyone can call this method to increment the counter
  @method
  public update() {
    // obtain 'count' from the off-chain state
    const currentCount = this.count.get();
    // increment the counter
    const newCount = currentCount.add(1);
    // set the new count off-chain state
    this.count.set(newCount);
  }
}
```

<br/>

### Transactions with off-chain state

**Is that it?** Well not exactly... you still have to actually go and fetch the off-chain state required for your contract to run. This can be done by wrapping your contract transaction into `contractApi.transaction(...)`, instead of using `Mina.transaction(...)` directly.

```typescript title="counter.test.ts" showLineNumbers
it('should update the counter', async () => {
  const senderKey = PrivateKey.random();
  const senderAccount = senderKey.toPublicKey();
  // setup Contract API
  const contractApi = new ContractApi();
  // instance of the Counter contract
  const zkApp = new Counter();

  // Contract API automatically deducts with off-chain keys to fetch
  const tx = await contractApi.transaction(zkApp, senderAccount, () => {
    zkApp.update();
  });

  await tx.prove();
  await tx.sign([senderKey]).send();
});
```

<br/>

:::note
Please keep in mind that the example above works for simple contracts such as the Counter. If your contract relies
on more complext data structures - e.g. if you use our nested map API, then you might be required to specify what data to fetch
for each contract method manually.

This isn't the target solution, there's a way to determine what keys and merkle maps need to be pre-fetched automatically, but its always
up to the developer to consider the performance trade offs of both approaches.

**We'll ship automated key/map pre-fetching in the coming releases of the Contract API.**
:::

### Cryptographic guarantees and working principles

Contract API is cool, but what actually happens when you `.get()` or `.set()` state? Let's take a look at how Count's off-chain state data ends up being represented in the ZKFS network & tooling.

#### Contract root map and `OffchainStateContract`

Each contract has a single corresponding `root map`, which is an instance of SnarkyJS's `MerkleMap`. By extending the `OffchainStateContract` in your `Counter`, you gain access to what Contract API has to offer. Firstly this means defining an on-chain `@state()` for the root map's `offchainStateRootHash`. This piece of on-chain state is the root has of your off-chain state root map. No other on-chain data is required for your contract to be compatible with ZKFS.

#### Defining off-chain state

Our `count` is a piece of off-chain state that resides directly on the root map itself. We know it is of type `UInt64` which is important for both receving data inside a contract, and for emitting new data through events. Data that can be stored in merkle maps, including the root map, must be of type `FlexibleProvablePure<T>`, which covers all SnarkyJS primitives such as `UInt64` or `Struct({...})`.

In this case the property name `count` is used as a key in the root map. Initially the value is empty (`Field(0)` by default). We'll explain how data is written below.

#### Deploying contracts & setting data

The Counter contract we've seen earlier has an `init()` method, which is a built-in SnarkyJS feature, that allows us to setup our on-chain state at the time of deployment. We can use the same principles to set up our off-chain state as well.

In order to set the initial value of our `count` off-chain state, we have to use the `.set(value)` method, available on `OffchainState`. Once you call `.set(...)`, the provided value is set in the `@zkfs/virtual-storage`, which ensures you can get/set values multiple times while executing your smart contract method. More importantly an event containing all the relevant information about your data write request is emitted. These events contain the `path` to your value, and the value itself. This helps us identify in which merkle map you want to update the data.

One of the most important concepts that ensure an eventual 100% data availability, is that the emitting of events is part of the proof/circuit itself. This means you cannot calculate a valid proof, without providing the necessary events with the required data. There are some shortcomings due to limits of data you can include in events, which we've brought up [here](https://github.com/o1-labs/snarkyjs/issues/757#issue-1602789987).

#### Reading data in contract methods

We've already covered how you can define and set off-chain state, the next logical step is to retrieve it within our contract. You can access off-chain state by calling `.get()` on your defined state. In our case that would be `this.count.get()`.

> As of current technical preview, the ContractAPI operates in an isolated test mode, which means that the data is only get/set from the virtual storage. Upcoming release of the `@zkfs/node` will provide a full lifecycle experience as described in our flow diagrams above.

For the sake of a simplified explanation, we assume the data required for the execution of our smart-contract method has already been pre-fetched and stored in the virtual storage.

Once you call `.get()`, the Contract API will bring in a `MerkleMapWitness` for your specific map key (in our case `count`), and also the value stored under our key (e.g. `0`, or `1`, or whatever the current state is). As a next step, the Contract API uses the received value and merkle witness to calculate a **computed root hash**, if the computed root hash matches your on-chain root-hash (`offchainStateRootHash`) then the data received is considered valid.

This was a very simplified explanation of the data correctness verification, there's a bit more to it - like making sure the on-chain root hash you're asserting against is actually the correct one. You can learn more about SnarkyJS/Mina transaction pre-conditions in the [SnarkyJS docs](https://docs.minaprotocol.com/zkapps/how-to-write-a-zkapp#reading-state).

:::note
These are the same principles as enforced by `@zkfs/node`'s consensus algorithm.
:::

### Nested map API

We keep mentioning nested map API as it is one of the most powerful features of ZKFS's Contract API. You can find an example contract that uses it [here](https://github.com/zkfs-io/zkfs/blob/develop/packages/examples/test/piggyBank.ts). The nested maps work by storing the nested map's root hash, as a value in its parent map under a specific key (map's name). This pattern allows you to store nested and complex data structures recursively, while adhering to the same cryptographic guarantees going upwards in the parent tree.

## What can you expect in the near future?

If you'd like to explore and use ZKFS's toolkit further, please take a look at our existing [examples](https://github.com/zkfs-io/zkfs/tree/develop/packages/examples), or try them in our [playground](https://stackblitz.com/github/zkfs-io/zkfs?file=packages%2Fexamples%2Ftest%2Fcounter.test.ts,packages%2Fexamples%2Ftest%2Fcounter.ts&hideExplorer=1&hideNavigation=1&theme=dark&view=editor).

We're also actively working on delivering all the appropriate documentation needed for you to start using ZKFS to its full potential. One of the key stepping stones in the future of ZKFS, is our [zkIgnite funding proposal](https://zkignite.minaprotocol.com/zkignite/dev4dev-track-1/phase1-draftproposals/suggestion/346).

**If you'd like to voice your support towards ZKFS, you can do so on:**

- [Our zkIgnite funding proposal](https://zkignite.minaprotocol.com/zkignite/dev4dev-track-1/phase1-draftproposals/suggestion/346)
- [Our twitter](https://twitter.com/zkfs_io)
- [Mina discord](https://discord.gg/pdKS7px98G)

**Thank you for reading and see you in the next blog post.**

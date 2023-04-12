/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable new-cap */
import {
  Key,
  OffchainState,
  offchainState,
  OffchainStateContract,
  OffchainStateMapRoot,
  withOffchainState,
} from '@zkfs/contract-api';
import { safeUint64Sub } from '@zkfs/safe-math';
import {
  Circuit,
  Field,
  method,
  Reducer,
  State,
  state,
  Struct,
  UInt64,
  Permissions,
} from 'snarkyjs';

class Action extends Struct({
  type: Field,

  payload: {
    id: UInt64,
    by: UInt64,
  },
}) {
  public static get types() {
    return {
      increment: Field(0),
      decrement: Field(1),
    };
  }

  public static increment(id: UInt64, by: UInt64): Action {
    return new Action({
      type: Action.types.increment,
      payload: { id, by },
    });
  }

  public static decrement(id: UInt64, by: UInt64): Action {
    return new Action({
      type: Action.types.decrement,
      payload: { id, by },
    });
  }
}

class ConcurrentCounter extends OffchainStateContract {
  public static defaultCounterValue = () => UInt64.from(0);

  public static idToKey = (id: UInt64): Key<UInt64> =>
    Key.fromType<UInt64>(UInt64, id);

  // until snarkyjs fixes bug with state indexes in extended classes
  @state(Field) public placeholder = State<Field>();

  @state(Field) public actionsHash = State<Field>();

  public reducer = Reducer({ actionType: Action });

  @offchainState() public counters = OffchainState.fromMap();

  @withOffchainState
  public init() {
    super.init();
    this.actionsHash.set(Reducer.initialActionsHash);
    this.root.setRootHash(OffchainStateMapRoot.initialRootHash);
    this.counters.setRootHash(OffchainStateMapRoot.initialRootHash);

    this.account.permissions.set({
      ...Permissions.default(),
      editSequenceState: Permissions.proofOrSignature(),
      editState: Permissions.proofOrSignature(),
    });
  }

  public getCounter(id: UInt64): [UInt64, OffchainState<UInt64, UInt64>] {
    return this.counters.getOrDefault<UInt64, UInt64>(
      UInt64,
      ConcurrentCounter.idToKey(id),
      UInt64.from(0)
    );
  }

  public setCounter(
    id: UInt64,
    value: UInt64
  ): [UInt64, OffchainState<UInt64, UInt64>] {
    return this.counters.set<UInt64, UInt64>(
      UInt64,
      ConcurrentCounter.idToKey(id),
      value
    );
  }

  @method
  public increment(id: UInt64, by: UInt64) {
    this.reducer.dispatch(Action.increment(id, by));
  }

  @method
  public decrement(id: UInt64, by: UInt64) {
    this.reducer.dispatch(Action.decrement(id, by));
  }

  public applyAction(action: Action) {
    const { id, by } = action.payload;

    const [counter] = this.getCounter(id);

    const newCounter = Circuit.if(
      action.type.equals(Action.types.increment),
      counter.add(by),
      safeUint64Sub(counter, by)
    );

    this.setCounter(id, newCounter);
  }

  public reduce(rootHash: Field, action: Action): Field {
    this.applyAction(action);
    return this.root.getRootHash();
  }

  @method
  @withOffchainState
  public rollup() {
    const actionsHash = this.actionsHash.get();
    this.actionsHash.assertEquals(actionsHash);

    const pendingActions = this.reducer.getActions({
      fromActionHash: actionsHash,
    });

    const currentRootHash = this.root.getRootHash();

    const { actionsHash: newActionsHash, state: newRootHash } =
      this.withRollingState(() =>
        this.reducer.reduce(
          pendingActions,
          Field,
          this.reduce.bind(this),
          {
            state: currentRootHash,
            actionsHash,
          },
          { maxTransactionsWithActions: 1 }
        )
      );

    this.actionsHash.set(newActionsHash);
    this.root.setRootHash(newRootHash);
  }
}

export default ConcurrentCounter;

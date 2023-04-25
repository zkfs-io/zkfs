import { UInt64, method } from 'snarkyjs';
import {
  offchainState,
  OffchainStateContract,
  OffchainState,
  withOffchainState,
} from '@zkfs/contract-api';

class Counter2 extends OffchainStateContract {
  @offchainState() public count1 = OffchainState.fromRoot<UInt64>(UInt64);
  @offchainState() public count2 = OffchainState.fromRoot<UInt64>(UInt64);

  @withOffchainState
  public init() {
    super.init();
    this.count1.set(UInt64.from(0));
    this.count2.set(UInt64.from(0));
  }

  @method
  @withOffchainState
  public update() {
    const currentCount = this.count1.get();
    const newCount = currentCount.add(1);
    const currentCount2 = this.count2.get();
    this.count1.set(newCount);
    const newCount2 = currentCount2.add(2);
    this.count2.set(newCount2);
  }
}

export default Counter2;

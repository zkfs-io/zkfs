import { UInt64, method, Circuit } from 'snarkyjs';
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
    Circuit.log('init count1');
    this.count1.set(UInt64.from(0));
    Circuit.log('init count2');
    this.count2.set(UInt64.from(0));
  }

  @method
  @withOffchainState
  public update() {
    Circuit.log('gets count1')
    const currentCount = this.count1.get();
    const newCount = currentCount.add(1);
    Circuit.log('gets count2')
    const currentCount2 = this.count2.get();
    this.count1.set(newCount);
    const newCount2 = currentCount2.add(2);
    this.count2.set(newCount2);
    Circuit.log('end of update')
  }
}

export default Counter2;

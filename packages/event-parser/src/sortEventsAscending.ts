/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/prefer-readonly-parameter-types */
/* eslint-disable id-length */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import type Events from './types.js';

function sortEventsByBlockHeight(events: Events): Events {
  return events.sort((a, b) => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (a.blockHeight.lessThan(b.blockHeight).toBoolean()) {
      return -1;
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (a.blockHeight.greaterThan(b.blockHeight).toBoolean()) {
      return 1;
    }
    return 0;
  });
}
export default sortEventsByBlockHeight;

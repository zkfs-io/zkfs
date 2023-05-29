/* eslint-disable max-len */
// eslint-disable-next-line etc/prefer-interface
type TriggerCallback = () => Promise<void>;

class Trigger {
  public isRunning = false;

  public doTask;

  public constructor(interval: number) {
    this.doTask = this.withPause(interval);
  }

  public register(triggerCallback: TriggerCallback) {
    this.doTask(() => {
      void this.runCallback(triggerCallback);
    });
  }

  /**
   * Create a scheduler for calling callbacks with a fixed delay in-between each call.
   *
   * @param milliseconds the in between-delay in milliseconds
   * @returns a function to add callbacks to the queue
   */
  public withPause(milliseconds: number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queue: any[] = [];
    // eslint-disable-next-line @typescript-eslint/init-declarations
    let timeoutId: NodeJS.Timeout | undefined;

    function doNext() {
      if (queue.length > 0 && timeoutId === undefined) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        queue.shift()();
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        pauseThenContinue();
      }
    }

    function pauseThenContinue() {
      timeoutId = setTimeout(() => {
        timeoutId = undefined;
        doNext();
      }, milliseconds);
    }

    // @ts-expect-error callback has any type
    return (callback) => {
      queue.push(callback);
      doNext();
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  public async runCallback(triggerCallback: TriggerCallback) {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    try {
      // eslint-disable-next-line promise/prefer-await-to-then, promise/always-return
      void triggerCallback().then(() => {
        this.doTask(() => {
          void this.runCallback(triggerCallback);
        });
      });
    } finally {
      this.isRunning = false;
    }
  }
}

export default Trigger;

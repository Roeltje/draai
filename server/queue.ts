type Job = {
  key: string;
  priority: number;
  run: () => Promise<void>;
  resolve: () => void;
  promise: Promise<void>;
};
/** One paced worker. Priority promotion never duplicates queued or in-flight work. */
export class WorkQueue {
  private jobs = new Map<string, Job>();
  private active: Job | null = null;
  private timer: NodeJS.Timeout | null = null;
  private worker: Promise<void> | null = null;
  private stopped = false;
  private waiters: Array<() => void> = [];
  constructor(
    private wait: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
  ) {}
  enqueue(
    key: string,
    priority: number,
    run: () => Promise<void>,
  ): Promise<void> {
    if (this.stopped) return Promise.resolve();
    if (this.active?.key === key) return this.active.promise;
    const old = this.jobs.get(key);
    if (old) {
      old.priority = Math.max(old.priority, priority);
      return old.promise;
    }
    let resolve!: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    this.jobs.set(key, { key, priority, run, resolve, promise });
    if (!this.worker && !this.timer)
      this.timer = setTimeout(() => {
        this.timer = null;
        this.worker = this.drain();
      }, 0);
    return promise;
  }
  private async drain() {
    try {
      while (!this.stopped && this.jobs.size) {
        const job = [...this.jobs.values()].sort(
          (a, b) => b.priority - a.priority,
        )[0];
        this.jobs.delete(job.key);
        this.active = job;
        try {
          await job.run();
        } catch {
          /* Jobs own their sanitized failure state. */
        } finally {
          job.resolve();
          this.active = null;
        }
        if (!this.stopped && this.jobs.size) await this.wait(3000);
      }
    } finally {
      this.worker = null;
      if (!this.jobs.size || this.stopped)
        this.waiters.splice(0).forEach((r) => r());
    }
  }
  idle() {
    return !this.active && !this.jobs.size
      ? Promise.resolve()
      : new Promise<void>((r) => this.waiters.push(r));
  }
  cancel(prefix: string) {
    for (const [key, job] of this.jobs)
      if (key.startsWith(prefix)) {
        this.jobs.delete(key);
        job.resolve();
      }
  }
  async close() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.jobs.forEach((j) => j.resolve());
    this.jobs.clear();
    await this.worker;
    this.waiters.splice(0).forEach((r) => r());
  }
}

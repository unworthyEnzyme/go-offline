export class JobQueue {
  jobs: string[];
  constructor() {
    this.jobs = [];
  }

  enqueue(job: string) {
    this.jobs.push(job);
  }

  enqueueNJobs(jobs: string[]) {
    this.jobs.push(...jobs);
    return this;
  }

  dequeue() {
    const ID = this.jobs.shift();
    return ID;
  }

  dequeueNJobs(n: number) {
    return this.jobs.splice(0, n);
  }

  get length() {
    return this.jobs.length;
  }

  get isEmpty() {
    return this.length === 0;
  }
}

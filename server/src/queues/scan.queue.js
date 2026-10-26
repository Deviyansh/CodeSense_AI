import { processScanJob } from "../workers/scan.worker.js";
import { logger } from "../utils/logger.js";

class AsyncJobQueue {
  constructor() {
    this.inFlight = 0;
    this.maxConcurrency = 5;
    this.queue = [];
  }

  enqueue(payload) {
    logger.info("queue.job_enqueued", {
      scanId: payload.scanId,
      repositoryId: payload.repositoryId,
    });

    this.queue.push(payload);
    this._processNext();
  }

  _processNext() {
    if (this.inFlight >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const payload = this.queue.shift();
    this.inFlight++;

    // Process asynchronously without blocking caller
    setImmediate(async () => {
      try {
        await processScanJob(payload);
      } catch (err) {
        logger.error("queue.job_execution_unhandled_error", {
          scanId: payload.scanId,
          error: err.message,
        });
      } finally {
        this.inFlight--;
        this._processNext();
      }
    });
  }

  getMetrics() {
    return {
      waiting: this.queue.length,
      inFlight: this.inFlight,
      concurrencyLimit: this.maxConcurrency,
    };
  }
}

export const scanQueue = new AsyncJobQueue();

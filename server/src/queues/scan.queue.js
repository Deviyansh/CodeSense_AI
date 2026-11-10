import { processScanJob } from "../workers/scan.worker.js";
import { Scan } from "../models/scan.model.js";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";

class DurableJobQueue {
  constructor() {
    this.inFlight = 0;
    this.maxConcurrency = config.scanWorkerConcurrency || 2;
    this.queue = [];
    this.cancelledScanIds = new Set();
  }

  enqueue(payload) {
    logger.info("queue.job_enqueued", {
      scanId: payload.scanId,
      repositoryId: payload.repositoryId,
    });

    this.queue.push({
      ...payload,
      attempts: 0,
      enqueuedAt: Date.now(),
    });
    this._processNext();
  }

  async cancelScan(scanId) {
    this.cancelledScanIds.add(String(scanId));

    // Remove from pending queue if not yet in flight
    const initialLen = this.queue.length;
    this.queue = this.queue.filter((job) => String(job.scanId) !== String(scanId));
    const wasPending = this.queue.length < initialLen;

    // Update scan document
    await Scan.findByIdAndUpdate(scanId, {
      status: "cancelled",
      stage: "cancelled",
      cancellationRequested: true,
      cancelledAt: new Date(),
      progress: 100,
    });

    logger.info("queue.scan_cancelled", { scanId, wasPending });
    return { scanId, wasPending, cancelled: true };
  }

  _processNext() {
    if (this.inFlight >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }

    const job = this.queue.shift();
    const scanId = String(job.scanId);

    // If cancelled while waiting in queue, skip execution
    if (this.cancelledScanIds.has(scanId)) {
      this.cancelledScanIds.delete(scanId);
      this._processNext();
      return;
    }

    this.inFlight++;

    setImmediate(async () => {
      try {
        await processScanJob(job);
      } catch (err) {
        logger.error("queue.job_execution_unhandled_error", {
          scanId: job.scanId,
          error: err.message,
          attempt: job.attempts,
        });

        // Retry if attempts remaining and not terminal
        if (job.attempts < 1) {
          job.attempts++;
          logger.info("queue.job_retry_scheduled", { scanId: job.scanId, attempt: job.attempts });
          setTimeout(() => {
            this.queue.unshift(job);
            this._processNext();
          }, 1000);
        }
      } finally {
        this.inFlight--;
        this.cancelledScanIds.delete(scanId);
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

export const scanQueue = new DurableJobQueue();

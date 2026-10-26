import mongoose from "mongoose";
import { inMemoryDB, shouldUseMemoryStore } from "./store.js";

const ScanSchema = new mongoose.Schema(
  {
    repositoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Repository", required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    branch: { type: String, required: true },
    commitSha: { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "running", "completed", "failed", "cancelled"],
      default: "queued",
    },
    progress: { type: Number, default: 0 },
    stage: {
      type: String,
      enum: [
        "queued",
        "intake",
        "static_analysis",
        "secret_scan",
        "normalization",
        "persistence",
        "ai_enrichment",
        "completed",
        "failed",
        "cancelled",
      ],
      default: "queued",
    },
    scannerVersions: [
      {
        scanner: String,
        version: String,
        rulesetVersion: String,
      },
    ],
    errorCode: { type: String, default: null },
    errorMessage: { type: String, default: null },
    summary: {
      total: { type: Number, default: 0 },
      critical: { type: Number, default: 0 },
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 },
      info: { type: Number, default: 0 },
    },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ScanSchema.index({ repositoryId: 1, createdAt: -1 });

const MongooseScan = mongoose.models.Scan || mongoose.model("Scan", ScanSchema);

export const Scan = {
  create(data) {
    if (!shouldUseMemoryStore()) return MongooseScan.create(data);
    return inMemoryDB.scans.create(data);
  },
  findOne(query) {
    if (!shouldUseMemoryStore()) return MongooseScan.findOne(query);
    return inMemoryDB.scans.findOne(query);
  },
  findById(id) {
    if (!shouldUseMemoryStore()) return MongooseScan.findById(id);
    return inMemoryDB.scans.findById(id);
  },
  find(query) {
    if (!shouldUseMemoryStore()) return MongooseScan.find(query);
    return inMemoryDB.scans.find(query);
  },
  findByIdAndUpdate(id, update, options = { new: true }) {
    if (!shouldUseMemoryStore()) return MongooseScan.findByIdAndUpdate(id, update, options);
    return inMemoryDB.scans.findByIdAndUpdate(id, update, options);
  },
  updateOne(query, update) {
    if (!shouldUseMemoryStore()) return MongooseScan.updateOne(query, update);
    return inMemoryDB.scans.updateOne(query, update);
  },
  countDocuments(query) {
    if (!shouldUseMemoryStore()) return MongooseScan.countDocuments(query);
    return inMemoryDB.scans.countDocuments(query);
  },
  deleteMany(query) {
    if (!shouldUseMemoryStore()) return MongooseScan.deleteMany(query);
    return inMemoryDB.scans.deleteMany(query);
  },
};

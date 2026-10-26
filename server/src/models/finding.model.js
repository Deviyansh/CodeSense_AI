import mongoose from "mongoose";
import { inMemoryDB, shouldUseMemoryStore } from "./store.js";

const FindingSchema = new mongoose.Schema(
  {
    scanId: { type: mongoose.Schema.Types.ObjectId, ref: "Scan", required: true },
    scanner: { type: String, required: true },
    ruleId: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low", "info", "unknown"],
      required: true,
    },
    category: {
      type: String,
      enum: ["security", "correctness", "quality", "secrets", "dependencies"],
      required: true,
    },
    filePath: { type: String, required: true },
    startLine: { type: Number, default: 1 },
    endLine: { type: Number, default: 1 },
    fingerprint: { type: String, required: true },
    source: {
      type: String,
      enum: ["static-analysis", "dependency-tool", "ai-hypothesis"],
      default: "static-analysis",
    },
    codeSnippet: { type: String, default: "" },
    rawMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FindingSchema.index({ scanId: 1, severity: 1 });
FindingSchema.index({ scanId: 1, fingerprint: 1 });

const MongooseFinding = mongoose.models.Finding || mongoose.model("Finding", FindingSchema);

export const Finding = {
  create(data) {
    if (!shouldUseMemoryStore()) return MongooseFinding.create(data);
    return inMemoryDB.findings.create(data);
  },
  insertMany(items) {
    if (!shouldUseMemoryStore()) return MongooseFinding.insertMany(items);
    return Promise.all(items.map((item) => inMemoryDB.findings.create(item)));
  },
  findOne(query) {
    if (!shouldUseMemoryStore()) return MongooseFinding.findOne(query);
    return inMemoryDB.findings.findOne(query);
  },
  findById(id) {
    if (!shouldUseMemoryStore()) return MongooseFinding.findById(id);
    return inMemoryDB.findings.findById(id);
  },
  find(query) {
    if (!shouldUseMemoryStore()) return MongooseFinding.find(query);
    return inMemoryDB.findings.find(query);
  },
  countDocuments(query) {
    if (!shouldUseMemoryStore()) return MongooseFinding.countDocuments(query);
    return inMemoryDB.findings.countDocuments(query);
  },
  deleteMany(query) {
    if (!shouldUseMemoryStore()) return MongooseFinding.deleteMany(query);
    return inMemoryDB.findings.deleteMany(query);
  },
};

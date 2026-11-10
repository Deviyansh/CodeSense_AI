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
    startColumn: { type: Number, default: 1 },
    endColumn: { type: Number, default: 1 },
    codeAnchor: { type: String, default: "" },
    codeSnippet: { type: String, default: "" },
    sanitizedSnippet: { type: String, default: "" },

    // Provenance
    toolName: { type: String, default: null },
    toolVersion: { type: String, default: null },
    rulesetVersion: { type: String, default: null },
    advisorySource: { type: String, default: null }, // e.g. OSV, NVD, GHSA
    advisoryId: { type: String, default: null },
    detectedAt: { type: Date, default: Date.now },

    // Classification
    confidence: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "high",
    },
    cwe: [{ type: String }],
    owasp: [{ type: String }],

    // Identity
    commitSha: { type: String, default: null },
    fingerprintVersion: { type: String, default: "v1" },
    fingerprint: { type: String, required: true },
    stableKey: { type: String, default: null },

    // Source & Evidence
    source: {
      type: String,
      enum: ["static-analysis", "dependency-tool", "ai-hypothesis"],
      default: "static-analysis",
    },
    scannerEvidenceRef: { type: String, default: null },
    ruleExplanation: { type: String, default: null },
    rawMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    sanitizedRawMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Lifecycle
    firstSeenScanId: { type: mongoose.Schema.Types.ObjectId, ref: "Scan", default: null },
    lastSeenScanId: { type: mongoose.Schema.Types.ObjectId, ref: "Scan", default: null },
    status: {
      type: String,
      enum: ["OPEN", "TRIAGED", "FIXED", "ACCEPTED_RISK", "FALSE_POSITIVE", "SUPPRESSED", "PERSISTENT"],
      default: "OPEN",
    },
    resolvedAt: { type: Date, default: null },
    suppressedUntil: { type: Date, default: null },

    // Triage
    state: {
      type: String,
      enum: ["open", "accepted", "risk-accepted", "false-positive", "fixed", "suppressed"],
      default: "open",
    },
    assignee: { type: String, default: null },
    comments: [
      {
        author: { type: String, required: true },
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

FindingSchema.index({ scanId: 1, severity: 1 });
FindingSchema.index({ scanId: 1, fingerprint: 1 });
FindingSchema.index({ stableKey: 1 });

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
  findByIdAndUpdate(id, update, options = { new: true }) {
    if (!shouldUseMemoryStore()) return MongooseFinding.findByIdAndUpdate(id, update, options);
    return inMemoryDB.findings.findByIdAndUpdate(id, update, options);
  },
  updateOne(query, update) {
    if (!shouldUseMemoryStore()) return MongooseFinding.updateOne(query, update);
    return inMemoryDB.findings.updateOne(query, update);
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

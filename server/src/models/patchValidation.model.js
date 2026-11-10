import mongoose from "mongoose";
import { inMemoryDB, shouldUseMemoryStore } from "./store.js";

const PatchValidationSchema = new mongoose.Schema(
  {
    findingId: { type: mongoose.Schema.Types.ObjectId, ref: "Finding", required: true },
    scanId: { type: mongoose.Schema.Types.ObjectId, ref: "Scan", default: null },
    patchHash: { type: String, required: true }, // SHA-256 of candidate diff
    targetFile: { type: String, required: true },
    checks: [
      {
        name: { type: String, required: true },
        passed: { type: Boolean, required: true },
        message: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    outcome: {
      type: String,
      enum: ["passed", "failed", "inconclusive"],
      required: true,
    },
    durationMs: { type: Number, default: 0 },
    logsReference: { type: String, default: null },
    toolVersions: { type: mongoose.Schema.Types.Mixed, default: {} },
    validatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

PatchValidationSchema.index({ findingId: 1, createdAt: -1 });

const MongoosePatchValidation =
  mongoose.models.PatchValidation || mongoose.model("PatchValidation", PatchValidationSchema);

export const PatchValidation = {
  create(data) {
    if (!shouldUseMemoryStore()) return MongoosePatchValidation.create(data);
    return inMemoryDB.patchValidations.create(data);
  },
  findOne(query) {
    if (!shouldUseMemoryStore()) return MongoosePatchValidation.findOne(query);
    return inMemoryDB.patchValidations.findOne(query);
  },
  findById(id) {
    if (!shouldUseMemoryStore()) return MongoosePatchValidation.findById(id);
    return inMemoryDB.patchValidations.findById(id);
  },
  find(query) {
    if (!shouldUseMemoryStore()) return MongoosePatchValidation.find(query);
    return inMemoryDB.patchValidations.find(query);
  },
  deleteMany(query) {
    if (!shouldUseMemoryStore()) return MongoosePatchValidation.deleteMany(query);
    return inMemoryDB.patchValidations.deleteMany(query);
  },
};


import mongoose from "mongoose";
import { inMemoryDB, shouldUseMemoryStore } from "./store.js";

const AIReviewSchema = new mongoose.Schema(
  {
    findingId: { type: mongoose.Schema.Types.ObjectId, ref: "Finding", required: true },
    provider: { type: String, default: "codesense-ai-engine" },
    model: { type: String, default: "gemini-1.5-flash" },
    promptVersion: { type: String, default: "v1.0" },
    schemaVersion: { type: String, default: "1.0" },
    summary: { type: String, required: true },
    whyItMatters: { type: String, required: true },
    suggestedFix: { type: String, default: null }, // Unified diff
    assumptions: [{ type: String }],
    confidence: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "high",
    },
    validationSteps: [{ type: String }],
    status: {
      type: String,
      enum: ["not_requested", "queued", "running", "completed", "failed"],
      default: "completed",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const MongooseAIReview = mongoose.models.AIReview || mongoose.model("AIReview", AIReviewSchema);

export const AIReview = {
  create(data) {
    if (!shouldUseMemoryStore()) return MongooseAIReview.create(data);
    return inMemoryDB.aiReviews.create(data);
  },
  findOne(query) {
    if (!shouldUseMemoryStore()) return MongooseAIReview.findOne(query);
    return inMemoryDB.aiReviews.findOne(query);
  },
  findById(id) {
    if (!shouldUseMemoryStore()) return MongooseAIReview.findById(id);
    return inMemoryDB.aiReviews.findById(id);
  },
  find(query) {
    if (!shouldUseMemoryStore()) return MongooseAIReview.find(query);
    return inMemoryDB.aiReviews.find(query);
  },
  deleteMany(query) {
    if (!shouldUseMemoryStore()) return MongooseAIReview.deleteMany(query);
    return inMemoryDB.aiReviews.deleteMany(query);
  },
};

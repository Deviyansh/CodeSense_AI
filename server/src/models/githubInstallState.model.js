import mongoose from "mongoose";
import { randomBytes } from "node:crypto";
import { inMemoryDB, shouldUseMemoryStore } from "./store.js";

const GitHubInstallStateSchema = new mongoose.Schema(
  {
    stateHash: {
      type: String,
      required: true,
      unique: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    browserKeyHash: {
      type: String,
      required: true,
    },
    returnTo: {
      type: String,
      enum: ["/repositories", "/"],
      default: "/repositories",
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
  },
  { timestamps: true }
);

const MongoInstallState =
  mongoose.models.GitHubInstallState ||
  mongoose.model("GitHubInstallState", GitHubInstallStateSchema);

export const GitHubInstallState = {
  create(data) {
    if (!shouldUseMemoryStore()) return MongoInstallState.create(data);
    return inMemoryDB.githubInstallStates.create(data);
  },

  findOne(query) {
    if (!shouldUseMemoryStore()) return MongoInstallState.findOne(query);
    return inMemoryDB.githubInstallStates.findOne(query);
  },

  async consumeValidState(stateHash, now = new Date()) {
  if (!shouldUseMemoryStore()) {
    return MongoInstallState.findOneAndDelete({
      stateHash,
      expiresAt: { $gt: now },
    });
  }

  // Local development/test adapter: consume synchronously.
  return inMemoryDB.githubInstallStates.consumeValidState(stateHash, now);
},

  deleteMany(query = {}) {
    if (!shouldUseMemoryStore()) return MongoInstallState.deleteMany(query);
    return inMemoryDB.githubInstallStates.deleteMany(query);
  },
};

export function createInstallStateToken() {
  return randomBytes(32).toString("hex");
}

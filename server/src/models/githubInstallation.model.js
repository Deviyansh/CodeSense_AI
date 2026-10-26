
import mongoose from "mongoose";
import { inMemoryDB, shouldUseMemoryStore } from "./store.js";

const GitHubInstallationSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    installationId: {
      type: String,
      required: true,
      index: true,
    },
    accountLogin: {
      type: String,
      required: true,
      trim: true,
    },
    accountType: {
      type: String,
      enum: ["User", "Organization"],
      required: true,
    },
    repositorySelection: {
      type: String,
      enum: ["all", "selected"],
      default: "selected",
    },
    suspendedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

GitHubInstallationSchema.index(
  { ownerId: 1, installationId: 1 },
  { unique: true }
);

const MongoInstallation =
  mongoose.models.GitHubInstallation ||
  mongoose.model("GitHubInstallation", GitHubInstallationSchema);

export const GitHubInstallation = {
  create(data) {
    if (!shouldUseMemoryStore()) return MongoInstallation.create(data);
    return inMemoryDB.githubInstallations.create(data);
  },

  findOne(query) {
    if (!shouldUseMemoryStore()) return MongoInstallation.findOne(query);
    return inMemoryDB.githubInstallations.findOne(query);
  },

  find(query = {}) {
    if (!shouldUseMemoryStore()) return MongoInstallation.find(query);
    return inMemoryDB.githubInstallations.find(query);
  },

  updateOne(query, update) {
    if (!shouldUseMemoryStore()) return MongoInstallation.updateOne(query, update);
    return inMemoryDB.githubInstallations.updateOne(query, update);
  },

  deleteMany(query = {}) {
    if (!shouldUseMemoryStore()) return MongoInstallation.deleteMany(query);
    return inMemoryDB.githubInstallations.deleteMany(query);
  },
};

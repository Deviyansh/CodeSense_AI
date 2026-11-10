import mongoose from "mongoose";
import { inMemoryDB, shouldUseMemoryStore } from "./store.js";

const RepositorySchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: String, default: "github" },
    providerRepoId: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    defaultBranch: { type: String, default: "main" },
    visibility: { type: String, enum: ["public", "private"], default: "public" },
    installationOrCredentialRef: { type: String, default: null },
  },
  { timestamps: true }
);

RepositorySchema.index({ provider: 1, providerRepoId: 1 });

const MongooseRepo = mongoose.models.Repository || mongoose.model("Repository", RepositorySchema);

export const Repository = {
  create(data) {
    if (!shouldUseMemoryStore()) return MongooseRepo.create(data);
    return inMemoryDB.repositories.create(data);
  },
  findOne(query) {
    if (!shouldUseMemoryStore()) return MongooseRepo.findOne(query);
    return inMemoryDB.repositories.findOne(query);
  },
  findById(id) {
    if (!shouldUseMemoryStore()) return MongooseRepo.findById(id);
    return inMemoryDB.repositories.findById(id);
  },
  find(query) {
    if (!shouldUseMemoryStore()) return MongooseRepo.find(query);
    return inMemoryDB.repositories.find(query);
  },
  countDocuments(query) {
    if (!shouldUseMemoryStore()) return MongooseRepo.countDocuments(query);
    return inMemoryDB.repositories.countDocuments(query);
  },
  deleteMany(query) {
    if (!shouldUseMemoryStore()) return MongooseRepo.deleteMany(query);
    return inMemoryDB.repositories.deleteMany(query);
  },
};

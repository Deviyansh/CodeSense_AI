import mongoose from "mongoose";
import { inMemoryDB, shouldUseMemoryStore } from "./store.js";

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    emailNormalized: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    github: {id: { type: String, default: null },
             username: { type: String, default: null },
             encryptedAccessToken: { type: String, default: null, select: false },
             connectedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

// Mongoose model declaration
const MongooseUser = mongoose.models.User || mongoose.model("User", UserSchema);

export const User = {
  create(data) {
    if (!shouldUseMemoryStore()) return MongooseUser.create(data);
    return inMemoryDB.users.create(data);
  },
  findOne(query) {
    if (!shouldUseMemoryStore()) return MongooseUser.findOne(query);
    return inMemoryDB.users.findOne(query);
  },
  findById(id) {
    if (!shouldUseMemoryStore()) return MongooseUser.findById(id);
    return inMemoryDB.users.findById(id);
  },
  countDocuments(query) {
    if (!shouldUseMemoryStore()) return MongooseUser.countDocuments(query);
    return inMemoryDB.users.countDocuments(query);
  },
  deleteMany(query) {
    if (!shouldUseMemoryStore()) return MongooseUser.deleteMany(query);
    return inMemoryDB.users.deleteMany(query);
  },
};

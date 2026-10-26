import crypto from "crypto";
import mongoose from "mongoose";

/**
 * In-memory persistence is only a local-development/test convenience.
 * Production requests must never silently write to volatile memory.
 */
export function shouldUseMemoryStore() {
  if (mongoose.connection.readyState === 1) return false;
  if (process.env.NODE_ENV === "production") {
    const error = new Error("MongoDB is unavailable; refusing to use volatile in-memory storage");
    error.statusCode = 503;
    error.code = "DATABASE_UNAVAILABLE";
    throw error;
  }
  return true;
}

// A memory/storage repository adapter that mirrors Mongoose query API
export class MemoryCollection {
  constructor(name) {
    this.name = name;
    this.docs = new Map();
  }

  generateId() {
    return new mongoose.Types.ObjectId().toString();
  }

  async create(data) {
    const _id = data._id ? String(data._id) : this.generateId();
    const now = new Date();
    const doc = {
      ...data,
      _id,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };
    this.docs.set(_id, JSON.parse(JSON.stringify(doc)));
    return this._wrap(doc);
  }

  async findById(id) {
    if (!id) return null;
    const doc = this.docs.get(String(id));
    return doc ? this._wrap(doc) : null;
  }

  findOne(query = {}) {
    const chain = this.find(query);
    const wrapper = this._wrap.bind(this);

    return {
      _chain: chain,
      sort(sortObj) {
        chain.sort(sortObj);
        return this;
      },
      then(resolve, reject) {
        return chain.then((items) => {
          resolve(items.length > 0 ? items[0] : null);
        }, reject);
      },
      async exec() {
        const items = await chain.exec();
        return items.length > 0 ? items[0] : null;
      },
    };
  }

  find(query = {}) {
    let items = Array.from(this.docs.values());

    // Basic query filtering
    items = items.filter((doc) => {
      for (const [key, value] of Object.entries(query)) {
        if (value && typeof value === "object" && "$in" in value) {
          if (!value.$in.includes(doc[key])) return false;
        } else if (value && typeof value === "object" && "$regex" in value) {
          const reg = new RegExp(value.$regex, value.$options || "i");
          if (!reg.test(doc[key] || "")) return false;
        } else if (String(doc[key]) !== String(value)) {
          return false;
        }
      }
      return true;
    });

    const chain = {
      _items: items,
      sort(sortObj = {}) {
        const [field, dir] = Object.entries(sortObj)[0] || [];
        if (field) {
          this._items.sort((a, b) => {
            const valA = a[field];
            const valB = b[field];
            if (valA < valB) return dir === -1 ? 1 : -1;
            if (valA > valB) return dir === -1 ? -1 : 1;
            return 0;
          });
        }
        return this;
      },
      skip(n) {
        if (n) this._items = this._items.slice(n);
        return this;
      },
      limit(n) {
        if (n) this._items = this._items.slice(0, n);
        return this;
      },
      then(resolve) {
        resolve(this._items.map((d) => this.wrapper(d)));
      },
      async exec() {
        return this._items.map((d) => this.wrapper(d));
      },
    };
    chain.wrapper = this._wrap.bind(this);
    return chain;
  }

  async countDocuments(query = {}) {
    const list = await this.find(query);
    return list.length;
  }

  async updateOne(query, update) {
    const doc = await this.findOne(query);
    if (!doc) return { matchedCount: 0, modifiedCount: 0 };

    const raw = this.docs.get(String(doc._id));
    const patch = update.$set || update;
    Object.assign(raw, patch, { updatedAt: new Date() });
    this.docs.set(String(doc._id), raw);
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const doc = await this.findById(id);
    if (!doc) return null;
    const raw = this.docs.get(String(id));
    const patch = update.$set || update;
    Object.assign(raw, patch, { updatedAt: new Date() });
    this.docs.set(String(id), raw);
    return this._wrap(raw);
  }
  consumeValidState(stateHash, now = new Date()) {
  for (const [id, doc] of this.docs.entries()) {
    if (doc.stateHash !== stateHash) continue;

    if (!doc.expiresAt || new Date(doc.expiresAt) <= now) {
      this.docs.delete(id);
      return null;
    }

    this.docs.delete(id);

    return this._wrap(doc);
  }

  return null;
}
  async deleteMany(query = {}) {
  const items = await this.find(query);
  let deletedCount = 0;

  for (const item of items) {
    if (this.docs.delete(String(item._id))) {
      deletedCount++;
    }
  }

  return { deletedCount };
}

  _wrap(rawDoc) {
    const copy = { ...rawDoc };
    return {
      ...copy,
      toObject() {
        return { ...copy };
      },
      toJSON() {
        return { ...copy };
      },
      async save() {
        rawDoc.updatedAt = new Date();
        return this;
      },
    };
  }
}

export const inMemoryDB = {
  users: new MemoryCollection("users"),
  repositories: new MemoryCollection("repositories"),
  scans: new MemoryCollection("scans"),
  findings: new MemoryCollection("findings"),
  aiReviews: new MemoryCollection("aiReviews"),
  githubInstallations: new MemoryCollection("githubInstallations"),
  githubInstallStates: new MemoryCollection("githubInstallStates"),
};

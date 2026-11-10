import mongoose from "mongoose";
import { inMemoryDB, shouldUseMemoryStore } from "./store.js";

const AuditEventSchema = new mongoose.Schema(
  {
    actor: { type: String, required: true }, // User ID or 'system'
    action: { type: String, required: true }, // e.g. "scan.created", "scan.cancelled", "finding.triaged", "patch.validated"
    resource: { type: String, required: true }, // e.g. "scan:123" or "finding:456"
    timestamp: { type: Date, default: Date.now },
    requestId: { type: String, default: null },
    safeMetadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditEventSchema.index({ actor: 1, timestamp: -1 });
AuditEventSchema.index({ action: 1, timestamp: -1 });
AuditEventSchema.index({ resource: 1, timestamp: -1 });

const MongooseAuditEvent =
  mongoose.models.AuditEvent || mongoose.model("AuditEvent", AuditEventSchema);

export const AuditEvent = {
  create(data) {
    if (!shouldUseMemoryStore()) return MongooseAuditEvent.create(data);
    return inMemoryDB.auditEvents.create(data);
  },
  find(query) {
    if (!shouldUseMemoryStore()) return MongooseAuditEvent.find(query);
    return inMemoryDB.auditEvents.find(query);
  },
  findOne(query) {
    if (!shouldUseMemoryStore()) return MongooseAuditEvent.findOne(query);
    return inMemoryDB.auditEvents.findOne(query);
  },
  deleteMany(query) {
    if (!shouldUseMemoryStore()) return MongooseAuditEvent.deleteMany(query);
    return inMemoryDB.auditEvents.deleteMany(query);
  },
};


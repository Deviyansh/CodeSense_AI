import { Finding } from "../models/finding.model.js";
import { Scan } from "../models/scan.model.js";
import { Repository } from "../models/repository.model.js";
import { AIReview } from "../models/aiReview.model.js";
import { PatchValidation } from "../models/patchValidation.model.js";
import { AuditEvent } from "../models/auditEvent.model.js";
import { generateAIReviewForFinding } from "../services/ai/ai.service.js";
import { validateCandidatePatch } from "../services/remediation/patch-validation.service.js";
import {
  queryFindingsSchema,
  triageFindingSchema,
  validatePatchSchema,
} from "../validators/schemas.js";

export async function listFindingsByScan(req, res, next) {
  try {
    const scanId = req.params.id;

    // Verify ownership
    const scan = await Scan.findById(scanId);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: { code: "SCAN_NOT_FOUND", message: "Scan not found" },
        meta: { requestId: req.id },
      });
    }

    const repository = await Repository.findOne({
      _id: scan.repositoryId,
      ownerId: req.user.id,
    });
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: { code: "SCAN_NOT_FOUND", message: "Scan not found" },
        meta: { requestId: req.id },
      });
    }

    const queryParams = queryFindingsSchema.parse(req.query);
    const filter = { scanId };

    if (queryParams.severity) filter.severity = queryParams.severity;
    if (queryParams.category) filter.category = queryParams.category;
    if (queryParams.scanner) filter.scanner = queryParams.scanner;
    if (queryParams.state) filter.state = queryParams.state;
    if (queryParams.status) filter.status = queryParams.status;

    let items = await Finding.find(filter);

    // Apply text search if provided
    if (queryParams.search) {
      const q = queryParams.search.toLowerCase();
      items = items.filter(
        (f) =>
          (f.title && f.title.toLowerCase().includes(q)) ||
          (f.message && f.message.toLowerCase().includes(q)) ||
          (f.filePath && f.filePath.toLowerCase().includes(q)) ||
          (f.ruleId && f.ruleId.toLowerCase().includes(q))
      );
    }

    const limit = queryParams.limit || 50;
    const paginated = items.slice(0, limit);

    res.status(200).json({
      success: true,
      data: {
        items: paginated,
        total: items.length,
        nextCursor: items.length > limit ? "has_more" : null,
      },
      meta: { requestId: req.id },
    });
  } catch (err) {
    if (err.name === "ZodError") {
      err.statusCode = 400;
      err.code = "VALIDATION_ERROR";
      err.message = err.errors.map((e) => e.message).join(", ");
    }
    next(err);
  }
}

export async function getFindingById(req, res, next) {
  try {
    const finding = await Finding.findById(req.params.id);
    if (!finding) {
      return res.status(404).json({
        success: false,
        error: { code: "FINDING_NOT_FOUND", message: "Finding not found" },
        meta: { requestId: req.id },
      });
    }

    // Ownership check via parent scan and repo
    const scan = await Scan.findById(finding.scanId);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: { code: "FINDING_NOT_FOUND", message: "Finding not found" },
        meta: { requestId: req.id },
      });
    }

    const repository = await Repository.findOne({
      _id: scan.repositoryId,
      ownerId: req.user.id,
    });
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: { code: "FINDING_NOT_FOUND", message: "Finding not found" },
        meta: { requestId: req.id },
      });
    }

    const [aiReview, patchValidations] = await Promise.all([
      AIReview.findOne({ findingId: finding._id }),
      PatchValidation.find({ findingId: finding._id }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        finding,
        aiReview: aiReview || null,
        patchValidation: patchValidations?.[0] || null,
      },
      meta: { requestId: req.id },
    });
  } catch (err) {
    next(err);
  }
}

export async function requestAIReview(req, res, next) {
  try {
    const finding = await Finding.findById(req.params.id);
    if (!finding) {
      return res.status(404).json({
        success: false,
        error: { code: "FINDING_NOT_FOUND", message: "Finding not found" },
        meta: { requestId: req.id },
      });
    }

    // Verify ownership
    const scan = await Scan.findById(finding.scanId);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: { code: "FINDING_NOT_FOUND", message: "Finding not found" },
        meta: { requestId: req.id },
      });
    }

    const repository = await Repository.findOne({
      _id: scan.repositoryId,
      ownerId: req.user.id,
    });
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: { code: "FINDING_NOT_FOUND", message: "Finding not found" },
        meta: { requestId: req.id },
      });
    }

    // Run AI review generation with user consent checking
    const review = await generateAIReviewForFinding(finding, req.user);

    await AuditEvent.create({
      actor: String(req.user.id),
      action: "finding.ai_review_generated",
      resource: `finding:${finding._id}`,
      requestId: req.id,
      safeMetadata: { providerMode: review.providerMode, provider: review.provider },
    });

    res.status(200).json({
      success: true,
      data: review,
      meta: { requestId: req.id },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Triage a finding: accept, suppress, assign, or mark false positive.
 */
export async function triageFinding(req, res, next) {
  try {
    const input = triageFindingSchema.parse(req.body);
    const finding = await Finding.findById(req.params.id);

    if (!finding) {
      return res.status(404).json({
        success: false,
        error: { code: "FINDING_NOT_FOUND", message: "Finding not found" },
        meta: { requestId: req.id },
      });
    }

    const scan = await Scan.findById(finding.scanId);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: { code: "FINDING_NOT_FOUND", message: "Finding not found" },
        meta: { requestId: req.id },
      });
    }

    const repository = await Repository.findOne({
      _id: scan.repositoryId,
      ownerId: req.user.id,
    });
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: { code: "FINDING_NOT_FOUND", message: "Finding not found" },
        meta: { requestId: req.id },
      });
    }

    const statusMap = {
      open: "OPEN",
      accepted: "ACCEPTED_RISK",
      accepted_risk: "ACCEPTED_RISK",
      "risk-accepted": "ACCEPTED_RISK",
      false_positive: "FALSE_POSITIVE",
      "false-positive": "FALSE_POSITIVE",
      fixed: "FIXED",
      suppressed: "SUPPRESSED",
    };

    const updateFields = {
      state: input.state,
      status: statusMap[input.state] || "TRIAGED",
    };

    if (input.assignee !== undefined) {
      updateFields.assignee = input.assignee;
    }

    if (input.state === "fixed") {
      updateFields.resolvedAt = new Date();
    }

    if (input.state === "suppressed" && input.suppressionDurationDays) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + input.suppressionDurationDays);
      updateFields.suppressedUntil = expiry;
    }

    const comments = finding.comments ? [...finding.comments] : [];
    if (input.comment) {
      comments.push({
        author: req.user.name || "User",
        text: input.comment,
        createdAt: new Date(),
      });
      updateFields.comments = comments;
    }

    const updated = await Finding.findByIdAndUpdate(finding._id, updateFields, { new: true });

    await AuditEvent.create({
      actor: String(req.user.id),
      action: "finding.triaged",
      resource: `finding:${finding._id}`,
      requestId: req.id,
      safeMetadata: { state: input.state, status: updateFields.status },
    });

    res.status(200).json({
      success: true,
      data: updated,
      meta: { requestId: req.id },
    });
  } catch (err) {
    if (err.name === "ZodError") {
      err.statusCode = 400;
      err.code = "VALIDATION_ERROR";
      err.message = err.errors.map((e) => e.message).join(", ");
    }
    next(err);
  }
}

/**
 * Validate a candidate patch in an isolated sandbox workspace.
 */
export async function validatePatch(req, res, next) {
  try {
    const input = validatePatchSchema.parse(req.body);
    const finding = await Finding.findById(req.params.id);

    if (!finding) {
      return res.status(404).json({
        success: false,
        error: { code: "FINDING_NOT_FOUND", message: "Finding not found" },
        meta: { requestId: req.id },
      });
    }

    const scan = await Scan.findById(finding.scanId);
    if (!scan) {
      return res.status(404).json({
        success: false,
        error: { code: "SCAN_NOT_FOUND", message: "Scan not found" },
        meta: { requestId: req.id },
      });
    }

    const repository = await Repository.findOne({
      _id: scan.repositoryId,
      ownerId: req.user.id,
    });
    if (!repository) {
      return res.status(404).json({
        success: false,
        error: { code: "REPOSITORY_NOT_FOUND", message: "Repository not found" },
        meta: { requestId: req.id },
      });
    }

    // Determine candidate diff: from request body or from existing AI review
    let candidateDiff = input.diff;
    if (!candidateDiff) {
      const review = await AIReview.findOne({ findingId: finding._id });
      candidateDiff = review?.suggestedFix;
    }

    if (!candidateDiff) {
      return res.status(400).json({
        success: false,
        error: {
          code: "NO_DIFF_AVAILABLE",
          message:
            "No candidate diff provided or found for this finding. Generate an AI review first or provide diff text.",
        },
        meta: { requestId: req.id },
      });
    }

    // Execute validation pipeline
    const validationResult = await validateCandidatePatch({
      finding,
      scan,
      repository,
      candidateDiff,
    });

    await AuditEvent.create({
      actor: String(req.user.id),
      action: "patch.validated",
      resource: `finding:${finding._id}`,
      requestId: req.id,
      safeMetadata: {
        outcome: validationResult.outcome,
        patchHash: validationResult.patchHash,
      },
    });

    res.status(200).json({
      success: true,
      data: validationResult,
      meta: { requestId: req.id },
    });
  } catch (err) {
    if (err.name === "ZodError") {
      err.statusCode = 400;
      err.code = "VALIDATION_ERROR";
      err.message = err.errors.map((e) => e.message).join(", ");
    }
    next(err);
  }
}

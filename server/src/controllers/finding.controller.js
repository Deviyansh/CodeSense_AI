import { Finding } from "../models/finding.model.js";
import { Scan } from "../models/scan.model.js";
import { Repository } from "../models/repository.model.js";
import { AIReview } from "../models/aiReview.model.js";
import { generateAIReviewForFinding } from "../services/ai/ai.service.js";
import { queryFindingsSchema } from "../validators/schemas.js";

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

    let items = await Finding.find(filter);

    // Apply text search if provided
    if (queryParams.search) {
      const q = queryParams.search.toLowerCase();
      items = items.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.message.toLowerCase().includes(q) ||
          f.filePath.toLowerCase().includes(q) ||
          f.ruleId.toLowerCase().includes(q)
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

    const aiReview = await AIReview.findOne({ findingId: finding._id });

    res.status(200).json({
      success: true,
      data: {
        finding,
        aiReview: aiReview || null,
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

    // Run AI review generation
    const review = await generateAIReviewForFinding(finding);

    res.status(200).json({
      success: true,
      data: review,
      meta: { requestId: req.id },
    });
  } catch (err) {
    next(err);
  }
}

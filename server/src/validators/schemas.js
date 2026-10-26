import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().email("Valid email address is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Valid email address is required"),
  password: z.string().min(1, "Password is required"),
});

export const createRepositorySchema = z.object({
  fullName: z.string().trim().min(3).max(200),
  providerRepoId: z.string().regex(/^\d+$/, "Invalid GitHub repository ID"),
  installationId: z.string().regex(/^\d+$/, "Invalid GitHub installation ID"),
  defaultBranch: z.string().trim().min(1).max(255).default("main"),
  visibility: z.enum(["public", "private"]).default("public"),
});


export const createScanSchema = z.object({
  branch: z.string().default("main"),
  commitSha: z.string().optional(),
});

export const queryFindingsSchema = z.object({
  severity: z.enum(["critical", "high", "medium", "low", "info", "unknown"]).optional(),
  category: z.enum(["security", "correctness", "quality", "secrets", "dependencies"]).optional(),
  scanner: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
  search: z.string().optional(),
});

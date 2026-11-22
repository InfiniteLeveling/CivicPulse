import { z } from "zod";
import * as fs from "node:fs";
import * as path from "node:path";

/**
 * CivicPulse Pre-Deployment Environment Validator
 * Non-destructive script to verify environment variables and configuration hygiene.
 * NEVER prints secret values to stdout or logs.
 */

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(10, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be a valid publishable key"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .trim()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .optional()
    .or(z.literal("")),
  GEMINI_API_KEY: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || val.length >= 10, {
      message: "GEMINI_API_KEY must be at least 10 characters if provided",
    }),
  GEMINI_MODEL: z.string().optional(),
});

export function checkDeploymentEnvironment(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: Record<string, { configured: boolean; scope: "public" | "server-only" }>;
} {
  // If running outside Next.js, load .env.local if present
  if (typeof process.loadEnvFile === "function") {
    const envLocalPath = path.resolve(process.cwd(), ".env.local");
    if (fs.existsSync(envLocalPath)) {
      try {
        process.loadEnvFile(envLocalPath);
      } catch {
        // Silently continue if already loaded or parsing error
      }
    }
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for dangerous client-exposed secrets
  const dangerousVars = [
    "NEXT_PUBLIC_GEMINI_API_KEY",
    "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_DB_PASSWORD",
    "NEXT_PUBLIC_SERVICE_ROLE_KEY",
  ];

  for (const danger of dangerousVars) {
    if (process.env[danger]) {
      errors.push(`CRITICAL SECURITY ERROR: Privileged secret exposed under public prefix: ${danger}`);
    }
  }

  // Parse known variables
  const result = envSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL,
  });

  if (!result.success) {
    for (const issue of result.error.issues) {
      errors.push(`${issue.path.join(".")}: ${issue.message}`);
    }
  }

  if (!process.env.GEMINI_API_KEY) {
    warnings.push("GEMINI_API_KEY is not configured; AI multimodal classification will operate in fallback mode.");
  }

  // Verify .gitignore covers environment files
  try {
    const gitignorePath = path.resolve(process.cwd(), ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, "utf-8");
      if (!gitignore.includes(".env")) {
        errors.push(".gitignore does not exclude .env files!");
      }
      if (!gitignore.includes(".vercel")) {
        warnings.push(".gitignore does not explicitly mention .vercel");
      }
    }
  } catch (err: unknown) {
    warnings.push(`Could not inspect .gitignore: ${err instanceof Error ? err.message : String(err)}`);
  }

  const summary = {
    NEXT_PUBLIC_SUPABASE_URL: {
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
      scope: "public" as const,
    },
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: {
      configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
      scope: "public" as const,
    },
    NEXT_PUBLIC_APP_URL: {
      configured: Boolean(process.env.NEXT_PUBLIC_APP_URL),
      scope: "public" as const,
    },
    GEMINI_API_KEY: {
      configured: Boolean(process.env.GEMINI_API_KEY),
      scope: "server-only" as const,
    },
    GEMINI_MODEL: {
      configured: Boolean(process.env.GEMINI_MODEL),
      scope: "server-only" as const,
    },
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary,
  };
}

if (process.argv[1] && process.argv[1].includes("check-env")) {
  const report = checkDeploymentEnvironment();
  console.log("=== CivicPulse Deployment Environment Check ===");
  console.log(`Status: ${report.isValid ? "PASS" : "FAIL"}`);
  console.log("\nConfigured Environment Variables (Values Redacted):");
  for (const [key, meta] of Object.entries(report.summary)) {
    console.log(`  - ${key} [${meta.scope}]: ${meta.configured ? "CONFIGURED" : "NOT CONFIGURED"}`);
  }
  if (report.warnings.length > 0) {
    console.log("\nWarnings:");
    for (const warn of report.warnings) console.log(`  - ${warn}`);
  }
  if (report.errors.length > 0) {
    console.log("\nErrors:");
    for (const err of report.errors) console.log(`  - ${err}`);
    process.exit(1);
  } else {
    console.log("\nEnvironment check passed successfully.");
  }
}

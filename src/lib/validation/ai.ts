import { z } from "zod";

export const aiCategoryEnum = z.enum([
  "pothole",
  "garbage",
  "water_leakage",
  "streetlight",
  "drainage",
  "other",
]);

export const aiSeverityEnum = z.enum(["low", "medium", "high", "critical"]);

export const aiClassifyRequestSchema = z.object({
  imageId: z.string().trim().min(1, "A valid image identifier is required."),
});

export const aiClassifyResultSchema = z.object({
  analysisId: z.string().trim().min(1, "Analysis identifier is required."),
  category: aiCategoryEnum,
  severity: aiSeverityEnum,
  description: z.string().trim().min(1, "Description is required."),
  isCivicIssue: z.boolean(),
});

export type AIClassifyResultSchema = z.infer<typeof aiClassifyResultSchema>;
export type AIClassifyRequestSchema = z.infer<typeof aiClassifyRequestSchema>;

export function validateAIClassification(data: unknown): AIClassifyResultSchema {
  return aiClassifyResultSchema.parse(data);
}

export function safeValidateAIClassification(data: unknown) {
  return aiClassifyResultSchema.safeParse(data);
}

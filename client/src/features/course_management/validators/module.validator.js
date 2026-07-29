import * as z from "zod";

export const moduleSchema = z.object({
  title: z.string().min(2, "Module title is required"),
  description: z.string().optional(),
  type: z.enum(["chapter", "unit", "lesson", "section", "topic"]).default("chapter"),
  order: z.number().int().default(0),
  releaseDate: z.string().optional(),
  dueDate: z.string().optional(),
  isGraded: z.boolean().default(false),
  maxScore: z.number().min(0).optional(),
});

export default moduleSchema;

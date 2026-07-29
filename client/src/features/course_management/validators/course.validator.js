import * as z from "zod";

export const courseSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.string().min(1, "Category is required"),
  difficulty: z.enum(["beginner", "intermediate", "advanced", "all_levels"]),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  thumbnail: z.any().optional(),
  prerequisites: z.array(z.string()).optional(),
  learningOutcomes: z.array(z.string()).optional(),
  maxEnrollments: z.number().int().positive().optional(),
  gradingScale: z.enum(["STANDARD", "PERCENTAGE", "PASS_FAIL"]).default("STANDARD"),
});

export default courseSchema;

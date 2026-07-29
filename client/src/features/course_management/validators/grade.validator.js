import * as z from "zod";

export const gradeSchema = z.object({
  submissionId: z.string().uuid("Invalid submission ID"),
  score: z.number().min(0, "Score must be at least 0"),
  maxScore: z.number().min(0, "Max score must be at least 0"),
  feedback: z.string().optional(),
});

export default gradeSchema;

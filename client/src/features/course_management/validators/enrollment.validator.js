import * as z from "zod";

export const enrollmentSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  courseId: z.string().uuid("Invalid course ID"),
  role: z.enum(["instructor", "teaching_assistant", "learner", "guest"]).default("learner"),
  status: z.enum(["pending", "active", "completed", "dropped", "suspended"]).default("active"),
});

export default enrollmentSchema;

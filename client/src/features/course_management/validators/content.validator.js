import * as z from "zod";

export const contentSchema = z.object({
  title: z.string().min(1, "Content title is required"),
  type: z.enum([
    "video",
    "reading",
    "document",
    "quiz",
    "assignment",
    "link",
    "presentation",
    "downloadable",
    "live_session",
    "interactive",
  ]),
  description: z.string().optional(),
  order: z.number().int().default(0),
  url: z.string().url("Invalid URL").optional(),
  duration: z.number().int().positive().optional(),
  isRequired: z.boolean().default(true),
  allowAccessAfter: z.string().optional(),
});

export default contentSchema;

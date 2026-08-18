import { z } from "zod";

import { identifierSchema } from "../catalog/catalog.schema.js";

export const progressParametersSchema = z.object({ lessonId: identifierSchema });
export const courseProgressParametersSchema = z.object({ courseId: identifierSchema });
export const updateProgressSchema = z.object({
  positionSeconds: z.number().finite().min(0),
});

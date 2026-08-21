import { z } from "zod";

import { identifierSchema } from "../library/library.schema.js";

export const progressParametersSchema = z.object({ videoId: identifierSchema });
export const playlistProgressParametersSchema = z.object({ playlistId: identifierSchema });
export const updateProgressSchema = z.object({
  positionSeconds: z.number().finite().min(0),
});

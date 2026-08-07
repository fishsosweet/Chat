import { z } from "zod";

export const callHistoryQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
    status: z.enum(["RINGING", "ONGOING", "ENDED", "MISSED", "REJECTED", "CANCELED", "FAILED"]).optional()
  })
});

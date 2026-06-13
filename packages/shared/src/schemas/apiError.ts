import { z } from "zod";

export const apiFieldErrorSchema = z
  .object({
    path: z.string().min(1),
    message: z.string().min(1)
  })
  .strict();

export const apiErrorSchema = z
  .object({
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
        details: z.unknown().optional(),
        fieldErrors: z.array(apiFieldErrorSchema).optional()
      })
      .strict()
  })
  .strict();

export type ApiFieldError = z.infer<typeof apiFieldErrorSchema>;
export type ApiError = z.infer<typeof apiErrorSchema>;

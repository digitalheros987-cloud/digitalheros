import { z } from 'zod';

/**
 * Zod schema for score creation/update.
 * Validates score_value (integer 1–45) and date_played (valid date, not in the future).
 */
export const scoreSchema = z.object({
  score_value: z
    .number({ invalid_type_error: 'Score must be a number' })
    .int('Score must be a whole number')
    .min(1, 'Score must be at least 1')
    .max(45, 'Score must be at most 45'),
  date_played: z
    .string()
    .min(1, 'Date is required')
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' })
    .refine(
      (val) => {
        const d = new Date(val);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        return d <= today;
      },
      { message: 'Date cannot be in the future' }
    ),
});

/**
 * Schema for parsing FormData inputs where values arrive as strings.
 * Converts string inputs to the proper types before validating with scoreSchema.
 */
export const scoreFormSchema = z
  .object({
    score_value: z.string().min(1, 'Score is required'),
    date_played: z.string().min(1, 'Date is required'),
  })
  .transform((data) => ({
    score_value: parseInt(data.score_value, 10),
    date_played: data.date_played,
  }))
  .pipe(scoreSchema);

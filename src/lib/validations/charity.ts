import { z } from 'zod';

/**
 * Zod schema for charity selection.
 * Validates charity_id (required UUID) and contribution_percentage (integer 10–100).
 */
export const charitySelectionSchema = z.object({
  charity_id: z
    .string()
    .uuid('Invalid charity ID'),
  contribution_percentage: z
    .number({ invalid_type_error: 'Contribution percentage must be a number' })
    .int('Contribution percentage must be a whole number')
    .min(10, 'Minimum contribution is 10%')
    .max(100, 'Maximum contribution is 100%'),
});

/**
 * Schema for parsing FormData inputs where values arrive as strings.
 */
export const charitySelectionFormSchema = z
  .object({
    charity_id: z.string().min(1, 'Please select a charity'),
    contribution_percentage: z.string().min(1, 'Contribution percentage is required'),
  })
  .transform((data) => ({
    charity_id: data.charity_id,
    contribution_percentage: parseInt(data.contribution_percentage, 10),
  }))
  .pipe(charitySelectionSchema);

import { z } from 'zod';

const optionalPositiveInt = z
  .string()
  .optional()
  .transform((v) => (v ? parseInt(v, 10) : null))
  .pipe(z.number().int().positive().nullable());

export const inputsSchema = z.object({
  branch_pattern: z.string().min(1, 'branch_pattern must not be empty'),
  fail_if_invalid_branch_name: z
    .enum(['true', 'false'])
    .default('false'),
  ignore_branch_pattern: z.string().optional(),
  skip_dependabot: z
    .enum(['true', 'false'])
    .default('true'),
  invalid_label: z.string().default('invalid-branch-name'),
  use_pr_review: z
    .enum(['true', 'false'])
    .default('false'),
  min_length: optionalPositiveInt,
  max_length: optionalPositiveInt,
  check_pr_title: z
    .enum(['true', 'false'])
    .default('false'),
  require_ticket_id: z
    .enum(['true', 'false'])
    .default('false'),
  invalid_comment_template: z.string().optional(),
  success_comment_template: z.string().optional(),
  skip_comment_template: z.string().optional(),
  comment_on_success: z
    .enum(['true', 'false'])
    .default('true'),
});

export type RawInputs = z.input<typeof inputsSchema>;

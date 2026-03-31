import { z } from 'zod';

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
});

export type RawInputs = z.input<typeof inputsSchema>;

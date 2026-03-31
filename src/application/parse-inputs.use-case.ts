import * as core from '@actions/core';
import { ActionInputs } from '../domain/inputs.model';
import { inputsSchema } from '../domain/inputs.schema';

/**
 * If the user supplied a simple prefix list like `feature|fix|chore`, wrap it
 * into a full regex `^(feature|fix|chore)/.+`. Patterns that already start
 * with `^` are treated as raw regex and passed through unchanged.
 */
function normalizeBranchPattern(input: string): string {
  if (input.startsWith('^')) return input;
  return `^(${input})/.+`;
}

export default function parseInputs(): ActionInputs {
  const raw = {
    branch_pattern: core.getInput('branch_pattern'),
    fail_if_invalid_branch_name: core.getInput('fail_if_invalid_branch_name') || 'false',
    ignore_branch_pattern: core.getInput('ignore_branch_pattern') || undefined,
    skip_dependabot: core.getInput('skip_dependabot') || 'true',
    invalid_label: core.getInput('invalid_label'),
    use_pr_review: core.getInput('use_pr_review') || 'false',
  };

  const result = inputsSchema.safeParse(raw);

  if (!result.success) {
    const messages = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new Error(`🚨 Invalid action inputs: ${messages}`);
  }

  const { data } = result;

  return {
    branchPattern: normalizeBranchPattern(data.branch_pattern),
    failIfInvalidBranchName: data.fail_if_invalid_branch_name === 'true',
    ignoreBranchPatterns: data.ignore_branch_pattern
      ? data.ignore_branch_pattern.split(/[,\n]/).map((p) => p.trim()).filter(Boolean)
      : [],
    skipDependabot: data.skip_dependabot === 'true',
    invalidLabel: data.invalid_label,
    usePrReview: data.use_pr_review === 'true',
  };
}

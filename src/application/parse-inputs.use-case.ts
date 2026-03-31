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
    min_length: core.getInput('min_length') || undefined,
    max_length: core.getInput('max_length') || undefined,
    check_pr_title: core.getInput('check_pr_title') || 'false',
    require_ticket_id: core.getInput('require_ticket_id') || 'false',
    invalid_comment_template: core.getInput('invalid_comment_template') || undefined,
    success_comment_template: core.getInput('success_comment_template') || undefined,
    skip_comment_template: core.getInput('skip_comment_template') || undefined,
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
    minLength: data.min_length,
    maxLength: data.max_length,
    checkPrTitle: data.check_pr_title === 'true',
    requireTicketId: data.require_ticket_id === 'true',
    invalidCommentTemplate: data.invalid_comment_template ?? null,
    successCommentTemplate: data.success_comment_template ?? null,
    skipCommentTemplate: data.skip_comment_template ?? null,
  };
}

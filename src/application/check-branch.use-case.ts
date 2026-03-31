import * as core from '@actions/core';
import { GitHub } from '@actions/github/lib/utils';
import parseInputs from './parse-inputs.use-case';
import { renderTemplate } from './render-template.use-case';
import { findBotComment, BotComment } from './find-bot-comment.use-case';
import createComment from './create-comment.use-case';
import updateComment from './update-comment.use-case';
import setOutputs from './set-outputs.use-case';
import suggestBranchName from './suggest-branch-name.use-case';
import addLabel from './add-label.use-case';
import removeLabel from './remove-label.use-case';
import { findBotReview } from './find-bot-review.use-case';
import { submitRequestChangesReview, submitApproveReview } from './submit-pr-review.use-case';
import dismissReview from './dismiss-pr-review.use-case';
import {
  DEFAULT_INVALID_COMMENT_TEMPLATE,
  DEFAULT_SUCCESS_COMMENT_TEMPLATE,
  DEFAULT_SKIP_COMMENT_TEMPLATE,
} from '../domain/comment.constants';

type Octokit = InstanceType<typeof GitHub>;

export interface PullRequestContext {
  owner: string;
  repo: string;
  prNumber: number;
  branchName: string;
  prTitle: string;
  actor: string;
}

/** Update in-place when a previous comment exists; otherwise create a new one. */
async function postOrUpdate(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  body: string,
  previous: BotComment | undefined,
): Promise<void> {
  if (previous) {
    await updateComment(octokit, owner, repo, previous.id, body);
    core.info('✏️  Updated existing bot comment');
  } else {
    await createComment(octokit, owner, repo, prNumber, body);
    core.info('💬 Posted new bot comment');
  }
}

/** Write a one-row job summary for this validation run. */
function writeSummary(branchName: string, branchPattern: string, result: string, reason?: string): void {
  core.summary
    .addHeading('Branch Name Validation', 3)
    .addTable([
      [
        { data: 'Branch', header: true },
        { data: 'Pattern', header: true },
        { data: 'Result', header: true },
        ...(reason ? [{ data: 'Reason', header: true }] : []),
      ],
      [
        branchName,
        branchPattern,
        result,
        ...(reason ? [reason] : []),
      ],
    ])
    .write()
    .catch(() => { /* summary API may not be available in all environments */ });
}

interface ValidationResult {
  valid: boolean;
  reasons: string[];
  captureGroups: Record<string, string>;
}

function validateBranch(
  branchName: string,
  branchPattern: string,
  minLength: number | null,
  maxLength: number | null,
  requireTicketId: boolean,
): ValidationResult {
  const reasons: string[] = [];

  const match = new RegExp(branchPattern).exec(branchName);
  const captureGroups = (match?.groups ?? {}) as Record<string, string>;

  if (!match) {
    reasons.push(`does not match pattern \`${branchPattern}\``);
  }

  if (minLength !== null && branchName.length < minLength) {
    reasons.push(`is shorter than the minimum length of ${minLength} characters`);
  }

  if (maxLength !== null && branchName.length > maxLength) {
    reasons.push(`exceeds the maximum length of ${maxLength} characters`);
  }

  if (requireTicketId && !captureGroups.ticket) {
    reasons.push('is missing a ticket ID (named capture group `ticket` not found)');
  }

  return { valid: reasons.length === 0, reasons, captureGroups };
}

export async function checkBranch(octokit: Octokit, ctx: PullRequestContext): Promise<void> {
  const inputs = parseInputs();
  const {
    owner, repo, prNumber, branchName, prTitle, actor,
  } = ctx;

  const invalidTemplate = inputs.invalidCommentTemplate ?? DEFAULT_INVALID_COMMENT_TEMPLATE;
  const successTemplate = inputs.successCommentTemplate ?? DEFAULT_SUCCESS_COMMENT_TEMPLATE;
  const skipTemplate = inputs.skipCommentTemplate ?? DEFAULT_SKIP_COMMENT_TEMPLATE;

  core.info(`🔍 Checking branch: ${branchName}`);

  const previousComment = await findBotComment(octokit, owner, repo, prNumber);
  const previousReview = inputs.usePrReview ? await findBotReview(octokit, owner, repo, prNumber) : undefined;

  const templateVars = {
    branch_name: branchName,
    branch_pattern: inputs.branchPattern,
    pr_number: String(prNumber),
    pr_author: actor,
    pr_title: prTitle,
  };

  // --- Dependabot skip ---
  const isDependabot = inputs.skipDependabot && (actor === 'dependabot[bot]' || branchName.startsWith('dependabot/'));

  if (isDependabot) {
    core.info('➡️  Dependabot branch detected — skipping check');
    setOutputs({ isValid: false, wasSkipped: true, captureGroups: {} });
    writeSummary(branchName, inputs.branchPattern, '⏭️ Skipped', 'Dependabot branch');
    if (inputs.invalidLabel) await removeLabel(octokit, owner, repo, prNumber, inputs.invalidLabel);
    await postOrUpdate(octokit, owner, repo, prNumber, renderTemplate(skipTemplate, templateVars), previousComment);
    return;
  }

  // --- Ignore pattern ---
  const isIgnored = inputs.ignoreBranchPatterns.some((p) => new RegExp(p).test(branchName));
  if (isIgnored) {
    core.info('➡️  Branch matches ignore_branch_pattern — skipping check');
    setOutputs({ isValid: false, wasSkipped: true, captureGroups: {} });
    writeSummary(branchName, inputs.branchPattern, '⏭️ Skipped', 'Matches ignore pattern');
    if (inputs.invalidLabel) await removeLabel(octokit, owner, repo, prNumber, inputs.invalidLabel);
    await postOrUpdate(octokit, owner, repo, prNumber, renderTemplate(skipTemplate, templateVars), previousComment);
    return;
  }

  // --- Branch name validation ---
  const branchResult = validateBranch(
    branchName,
    inputs.branchPattern,
    inputs.minLength,
    inputs.maxLength,
    inputs.requireTicketId,
  );

  // --- PR title validation (uses same pattern) ---
  const titleResult = inputs.checkPrTitle
    ? validateBranch(prTitle, inputs.branchPattern, inputs.minLength, inputs.maxLength, inputs.requireTicketId)
    : null;

  const allValid = branchResult.valid && (titleResult === null || titleResult.valid);
  const allReasons = [
    ...branchResult.reasons.map((r) => `Branch ${r}`),
    ...(titleResult ? titleResult.reasons.map((r) => `PR title ${r}`) : []),
  ];

  if (allValid) {
    core.info('✅ Branch name is valid');
    setOutputs({ isValid: true, wasSkipped: false, captureGroups: branchResult.captureGroups });
    writeSummary(branchName, inputs.branchPattern, '✅ Valid');
    if (inputs.invalidLabel) await removeLabel(octokit, owner, repo, prNumber, inputs.invalidLabel);
    await postOrUpdate(octokit, owner, repo, prNumber, renderTemplate(successTemplate, {
      ...templateVars,
      ...branchResult.captureGroups,
    }), previousComment);
    if (inputs.usePrReview) {
      if (previousReview) {
        await dismissReview(octokit, owner, repo, prNumber, previousReview.id);
      } else {
        await submitApproveReview(octokit, owner, repo, prNumber);
      }
    }
    return;
  }

  // --- Invalid ---
  core.info('🚨 Branch name is invalid');
  setOutputs({ isValid: false, wasSkipped: false, captureGroups: {} });
  writeSummary(branchName, inputs.branchPattern, '❌ Invalid', allReasons.join('; '));
  if (inputs.invalidLabel) await addLabel(octokit, owner, repo, prNumber, inputs.invalidLabel);

  await postOrUpdate(octokit, owner, repo, prNumber, renderTemplate(invalidTemplate, {
    ...templateVars,
    suggestion: suggestBranchName(branchName, inputs.branchPattern),
    validation_reasons: allReasons.map((r) => `- ${r}`).join('\n'),
  }), previousComment);

  if (inputs.usePrReview && !previousReview) {
    await submitRequestChangesReview(octokit, owner, repo, prNumber);
  }

  if (inputs.failIfInvalidBranchName) {
    core.setFailed(`🚨 Branch "${branchName}" does not match the required pattern: ${inputs.branchPattern}`);
  }
}

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

export async function checkBranch(octokit: Octokit, ctx: PullRequestContext): Promise<void> {
  const inputs = parseInputs();
  const {
    owner, repo, prNumber, branchName, actor,
  } = ctx;

  core.info(`🔍 Checking branch: ${branchName}`);

  const previousComment = await findBotComment(octokit, owner, repo, prNumber);
  const previousReview = inputs.usePrReview ? await findBotReview(octokit, owner, repo, prNumber) : undefined;

  // --- Dependabot skip ---
  const isDependabot = inputs.skipDependabot && (actor === 'dependabot[bot]' || branchName.startsWith('dependabot/'));

  if (isDependabot) {
    core.info('➡️  Dependabot branch detected — skipping check');
    setOutputs({ isValid: false, wasSkipped: true, captureGroups: {} });
    writeSummary(branchName, inputs.branchPattern, '⏭️ Skipped', 'Dependabot branch');
    if (inputs.invalidLabel) await removeLabel(octokit, owner, repo, prNumber, inputs.invalidLabel);
    const skipBody = renderTemplate(DEFAULT_SKIP_COMMENT_TEMPLATE, {
      branch_name: branchName,
      branch_pattern: inputs.branchPattern,
      pr_number: String(prNumber),
      pr_author: actor,
    });
    await postOrUpdate(octokit, owner, repo, prNumber, skipBody, previousComment);
    return;
  }

  // --- Ignore pattern ---
  const isIgnored = inputs.ignoreBranchPatterns.some((p) => new RegExp(p).test(branchName));
  if (isIgnored) {
    core.info('➡️  Branch matches ignore_branch_pattern — skipping check');
    setOutputs({ isValid: false, wasSkipped: true, captureGroups: {} });
    writeSummary(branchName, inputs.branchPattern, '⏭️ Skipped', 'Matches ignore pattern');
    if (inputs.invalidLabel) await removeLabel(octokit, owner, repo, prNumber, inputs.invalidLabel);
    const skipBody = renderTemplate(DEFAULT_SKIP_COMMENT_TEMPLATE, {
      branch_name: branchName,
      branch_pattern: inputs.branchPattern,
      pr_number: String(prNumber),
      pr_author: actor,
    });
    await postOrUpdate(octokit, owner, repo, prNumber, skipBody, previousComment);
    return;
  }

  // --- Branch pattern validation ---
  const match = new RegExp(inputs.branchPattern).exec(branchName);
  const captureGroups = (match?.groups ?? {}) as Record<string, string>;

  if (match) {
    core.info('✅ Branch name is valid');
    setOutputs({ isValid: true, wasSkipped: false, captureGroups });
    writeSummary(branchName, inputs.branchPattern, '✅ Valid');
    if (inputs.invalidLabel) await removeLabel(octokit, owner, repo, prNumber, inputs.invalidLabel);
    const successBody = renderTemplate(DEFAULT_SUCCESS_COMMENT_TEMPLATE, {
      branch_name: branchName,
      branch_pattern: inputs.branchPattern,
      pr_number: String(prNumber),
      pr_author: actor,
      ...captureGroups,
    });
    await postOrUpdate(octokit, owner, repo, prNumber, successBody, previousComment);
    if (inputs.usePrReview) {
      if (previousReview) {
        await dismissReview(octokit, owner, repo, prNumber, previousReview.id);
      } else {
        await submitApproveReview(octokit, owner, repo, prNumber);
      }
    }
    return;
  }

  // --- Invalid branch ---
  core.info('🚨 Branch name is invalid');
  setOutputs({ isValid: false, wasSkipped: false, captureGroups: {} });
  writeSummary(branchName, inputs.branchPattern, '❌ Invalid');
  if (inputs.invalidLabel) await addLabel(octokit, owner, repo, prNumber, inputs.invalidLabel);

  const body = renderTemplate(DEFAULT_INVALID_COMMENT_TEMPLATE, {
    branch_name: branchName,
    branch_pattern: inputs.branchPattern,
    pr_number: String(prNumber),
    pr_author: actor,
    suggestion: suggestBranchName(branchName, inputs.branchPattern),
  });

  await postOrUpdate(octokit, owner, repo, prNumber, body, previousComment);
  if (inputs.usePrReview && !previousReview) {
    await submitRequestChangesReview(octokit, owner, repo, prNumber);
  }

  if (inputs.failIfInvalidBranchName) {
    core.setFailed(`🚨 Branch "${branchName}" does not match the required pattern: ${inputs.branchPattern}`);
  }
}

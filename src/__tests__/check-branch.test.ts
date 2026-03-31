import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';
import * as core from '@actions/core';
import { COMMENT_SENTINEL } from '../domain/comment.constants';

import { checkBranch, PullRequestContext } from '../application/check-branch.use-case';

// ---- Mock @actions/core ----
vi.mock('@actions/core', () => {
  const summaryMock = {
    addHeading: vi.fn().mockReturnThis(),
    addTable: vi.fn().mockReturnThis(),
    write: vi.fn().mockResolvedValue(undefined),
  };
  return {
    getInput: vi.fn(),
    setFailed: vi.fn(),
    setOutput: vi.fn(),
    info: vi.fn(),
    summary: summaryMock,
  };
});

// ---- Helpers ----
function buildOctokit(comments: Array<{ id: number; user: { login: string }; body: string }> = []) {
  return {
    rest: {
      issues: {
        listComments: vi.fn().mockResolvedValue({ data: comments }),
        deleteComment: vi.fn().mockResolvedValue({}),
        createComment: vi.fn().mockResolvedValue({}),
        updateComment: vi.fn().mockResolvedValue({}),
        addLabels: vi.fn().mockResolvedValue({}),
        removeLabel: vi.fn().mockResolvedValue({}),
      },
      pulls: {
        listReviews: vi.fn().mockResolvedValue({ data: [] }),
        createReview: vi.fn().mockResolvedValue({ data: { id: 1 } }),
        dismissReview: vi.fn().mockResolvedValue({}),
      },
    },
  } as unknown as Parameters<typeof checkBranch>[0];
}

function mockInputs(overrides: Record<string, string> = {}) {
  vi.mocked(core.getInput).mockImplementation((name: string) => {
    const defaults: Record<string, string> = {
      branch_pattern: '^(feature|fix)/.+',
      fail_if_invalid_branch_name: 'false',
      skip_dependabot: 'true',
      invalid_label: 'invalid-branch-name',
    };
    return overrides[name] ?? defaults[name] ?? '';
  });
}

const baseCtx: PullRequestContext = {
  owner: 'org',
  repo: 'repo',
  prNumber: 1,
  branchName: 'feature/my-thing',
  actor: 'octocat',
};

describe('checkBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts a success comment for a valid branch name', async () => {
    mockInputs();
    const octokit = buildOctokit();
    await checkBranch(octokit, baseCtx);
    expect(octokit.rest.issues.createComment).toHaveBeenCalledOnce();
    const body = vi.mocked(octokit.rest.issues.createComment).mock.calls[0]![0]!.body as string;
    expect(body).toContain(COMMENT_SENTINEL);
    expect(body).toContain('[!TIP]');
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('posts a comment for an invalid branch name', async () => {
    mockInputs();
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'JIRA-123-something' });
    expect(octokit.rest.issues.createComment).toHaveBeenCalledOnce();
    const body = vi.mocked(octokit.rest.issues.createComment).mock.calls[0]![0]!.body as string;
    expect(body).toContain(COMMENT_SENTINEL);
    expect(body).toContain('JIRA-123-something');
    expect(body).toContain('@octocat');
  });

  it('calls core.setFailed when fail_if_invalid_branch_name is true', async () => {
    mockInputs({ fail_if_invalid_branch_name: 'true' });
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'bad-branch' });
    expect(core.setFailed).toHaveBeenCalledWith(expect.stringContaining('bad-branch'));
  });

  it('updates existing comment in-place when branch becomes valid', async () => {
    mockInputs();
    const previousComment = {
      id: 99,
      user: { login: 'github-actions[bot]' },
      body: `${COMMENT_SENTINEL}\nsome old content`,
    };
    const octokit = buildOctokit([previousComment]);
    await checkBranch(octokit, baseCtx);
    expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 99 }),
    );
    expect(octokit.rest.issues.deleteComment).not.toHaveBeenCalled();
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
    const body = vi.mocked(octokit.rest.issues.updateComment).mock.calls[0]![0]!.body as string;
    expect(body).toContain('[!TIP]');
  });

  it('updates existing comment in-place on repeated invalid push', async () => {
    mockInputs();
    const previousComment = {
      id: 55,
      user: { login: 'github-actions[bot]' },
      body: `${COMMENT_SENTINEL}\nold content`,
    };
    const octokit = buildOctokit([previousComment]);
    await checkBranch(octokit, { ...baseCtx, branchName: 'bad-branch' });
    expect(octokit.rest.issues.updateComment).toHaveBeenCalledWith(
      expect.objectContaining({ comment_id: 55 }),
    );
    expect(octokit.rest.issues.deleteComment).not.toHaveBeenCalled();
    expect(octokit.rest.issues.createComment).not.toHaveBeenCalled();
  });

  it('skips Dependabot branches by default and posts a skip comment', async () => {
    mockInputs();
    const octokit = buildOctokit();
    await checkBranch(octokit, {
      ...baseCtx,
      branchName: 'dependabot/npm_and_yarn/lodash-4.17.21',
      actor: 'dependabot[bot]',
    });
    expect(octokit.rest.issues.createComment).toHaveBeenCalledOnce();
    const body = vi.mocked(octokit.rest.issues.createComment).mock.calls[0]![0]!.body as string;
    expect(body).toContain('[!IMPORTANT]');
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('does NOT skip Dependabot when skip_dependabot=false', async () => {
    mockInputs({ skip_dependabot: 'false' });
    const octokit = buildOctokit();
    // dependabot branch name does not match ^(feature|fix)/.+ → should post comment
    await checkBranch(octokit, {
      ...baseCtx,
      branchName: 'dependabot/npm_and_yarn/lodash-4.17.21',
      actor: 'dependabot[bot]',
    });
    expect(octokit.rest.issues.createComment).toHaveBeenCalledOnce();
  });

  it('skips branches matching ignore_branch_pattern and posts a skip comment', async () => {
    mockInputs({ ignore_branch_pattern: '^release/' });
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'release/v1.2.3' });
    expect(octokit.rest.issues.createComment).toHaveBeenCalledOnce();
    const body = vi.mocked(octokit.rest.issues.createComment).mock.calls[0]![0]!.body as string;
    expect(body).toContain('[!IMPORTANT]');
    expect(core.setFailed).not.toHaveBeenCalled();
  });

  it('skips a branch matching the second of multiple ignore patterns', async () => {
    mockInputs({ ignore_branch_pattern: '^release/,^hotfix/' });
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'hotfix/urgent-fix' });
    expect(octokit.rest.issues.createComment).toHaveBeenCalledOnce();
    const body = vi.mocked(octokit.rest.issues.createComment).mock.calls[0]![0]!.body as string;
    expect(body).toContain('[!IMPORTANT]');
  });

  it('does not skip a branch that matches none of multiple ignore patterns', async () => {
    mockInputs({ ignore_branch_pattern: '^release/,^hotfix/', branch_pattern: '^(feature|fix)/.+' });
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'bad-branch' });
    const body = vi.mocked(octokit.rest.issues.createComment).mock.calls[0]![0]!.body as string;
    expect(body).toContain('[!CAUTION]');
  });

  it('adds the invalid-branch-name label when branch is invalid', async () => {
    mockInputs();
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'bad-branch' });
    expect(octokit.rest.issues.addLabels).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ['invalid-branch-name'] }),
    );
  });

  it('removes the label when branch becomes valid', async () => {
    mockInputs();
    const octokit = buildOctokit();
    await checkBranch(octokit, baseCtx);
    expect(octokit.rest.issues.removeLabel).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'invalid-branch-name' }),
    );
  });

  it('does not manage labels when invalid_label is empty', async () => {
    mockInputs({ invalid_label: '' });
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'bad-branch' });
    expect(octokit.rest.issues.addLabels).not.toHaveBeenCalled();
  });

  it('sets is_valid=true output for a valid branch', async () => {
    mockInputs();
    const octokit = buildOctokit();
    await checkBranch(octokit, baseCtx);
    expect(core.setOutput).toHaveBeenCalledWith('is_valid', 'true');
    expect(core.setOutput).toHaveBeenCalledWith('was_skipped', 'false');
  });

  it('sets is_valid=false output for an invalid branch', async () => {
    mockInputs();
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'bad-branch' });
    expect(core.setOutput).toHaveBeenCalledWith('is_valid', 'false');
    expect(core.setOutput).toHaveBeenCalledWith('was_skipped', 'false');
  });

  it('sets was_skipped=true for a Dependabot branch', async () => {
    mockInputs();
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'dependabot/npm/lodash', actor: 'dependabot[bot]' });
    expect(core.setOutput).toHaveBeenCalledWith('was_skipped', 'true');
  });

  it('exposes named capture groups as branch_type and ticket_id outputs', async () => {
    mockInputs({ branch_pattern: '^(?<type>feature|fix)/(?<ticket>[A-Z]+-\\d+)-.+$' });
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'feature/JIRA-42-my-story' });
    expect(core.setOutput).toHaveBeenCalledWith('branch_type', 'feature');
    expect(core.setOutput).toHaveBeenCalledWith('ticket_id', 'JIRA-42');
  });

  it('submits a REQUEST_CHANGES review when use_pr_review=true and branch is invalid', async () => {
    mockInputs({ use_pr_review: 'true' });
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'bad-branch' });
    expect(octokit.rest.pulls.createReview).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'REQUEST_CHANGES' }),
    );
  });

  it('submits an APPROVE review when use_pr_review=true and branch is valid (no prior review)', async () => {
    mockInputs({ use_pr_review: 'true' });
    const octokit = buildOctokit();
    await checkBranch(octokit, baseCtx);
    expect(octokit.rest.pulls.createReview).toHaveBeenCalledWith(
      expect.objectContaining({ event: 'APPROVE' }),
    );
  });

  it('does not submit a review when use_pr_review=false', async () => {
    mockInputs({ use_pr_review: 'false' });
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'bad-branch' });
    expect(octokit.rest.pulls.createReview).not.toHaveBeenCalled();
  });

  it('renders branch variables in the invalid-branch comment body', async () => {
    mockInputs();
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'bad-branch' });
    const body = vi.mocked(octokit.rest.issues.createComment).mock.calls[0]![0]!.body as string;
    expect(body).toContain('bad-branch');
    expect(body).toContain('^(feature|fix)/.+');
    expect(body).toContain('[!CAUTION]');
  });

  it('renders branch variables in the success comment body', async () => {
    mockInputs();
    const octokit = buildOctokit();
    await checkBranch(octokit, baseCtx);
    const body = vi.mocked(octokit.rest.issues.createComment).mock.calls[0]![0]!.body as string;
    expect(body).toContain('feature/my-thing');
    expect(body).toContain('[!TIP]');
  });

  it('renders branch variables in the skip comment body', async () => {
    mockInputs({ ignore_branch_pattern: '^release/' });
    const octokit = buildOctokit();
    await checkBranch(octokit, { ...baseCtx, branchName: 'release/v1.2.3' });
    const body = vi.mocked(octokit.rest.issues.createComment).mock.calls[0]![0]!.body as string;
    expect(body).toContain('release/v1.2.3');
    expect(body).toContain('[!IMPORTANT]');
  });
});

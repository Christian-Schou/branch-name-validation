import { GitHub } from '@actions/github/lib/utils';
import { COMMENT_SENTINEL, COMMENT_SENTINEL_END } from '../domain/comment.constants';

type Octokit = InstanceType<typeof GitHub>;

const REVIEW_INVALID_BODY = `${COMMENT_SENTINEL}\n❌ Branch name does not follow the required naming convention.\n${COMMENT_SENTINEL_END}`;
const REVIEW_VALID_BODY = `${COMMENT_SENTINEL}\n✅ Branch name is valid.\n${COMMENT_SENTINEL_END}`;

export async function submitRequestChangesReview(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<number> {
  const { data } = await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    event: 'REQUEST_CHANGES',
    body: REVIEW_INVALID_BODY,
  });
  return data.id;
}

export async function submitApproveReview(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<void> {
  await octokit.rest.pulls.createReview({
    owner,
    repo,
    pull_number: prNumber,
    event: 'APPROVE',
    body: REVIEW_VALID_BODY,
  });
}

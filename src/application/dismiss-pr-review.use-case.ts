import { GitHub } from '@actions/github/lib/utils';

type Octokit = InstanceType<typeof GitHub>;

export default async function dismissReview(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  reviewId: number,
): Promise<void> {
  await octokit.rest.pulls.dismissReview({
    owner,
    repo,
    pull_number: prNumber,
    review_id: reviewId,
    message: '✅ Branch name is now valid.',
  });
}

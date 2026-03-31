import { GitHub } from '@actions/github/lib/utils';
import { COMMENT_SENTINEL } from '../domain/comment.constants';

type Octokit = InstanceType<typeof GitHub>;

export interface BotReview {
  id: number;
}

export async function findBotReview(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<BotReview | undefined> {
  const { data: reviews } = await octokit.rest.pulls.listReviews({
    owner,
    repo,
    pull_number: prNumber,
    per_page: 100,
  });

  const found = reviews.find((r) => r.user?.login === 'github-actions[bot]'
    && r.state === 'CHANGES_REQUESTED'
    && r.body?.includes(COMMENT_SENTINEL));

  return found ? { id: found.id } : undefined;
}

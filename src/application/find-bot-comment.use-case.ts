import { GitHub } from '@actions/github/lib/utils';
import { COMMENT_SENTINEL } from '../domain/comment.constants';

type Octokit = InstanceType<typeof GitHub>;

export interface BotComment {
  id: number;
  body: string;
}

export async function findBotComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
): Promise<BotComment | undefined> {
  const { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });

  const found = comments.find(
    (c) => c.user?.login === 'github-actions[bot]'
      && c.body?.includes(COMMENT_SENTINEL),
  );

  if (!found || !found.body) return undefined;

  return { id: found.id, body: found.body };
}

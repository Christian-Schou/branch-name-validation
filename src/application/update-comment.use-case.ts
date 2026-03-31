import { GitHub } from '@actions/github/lib/utils';

type Octokit = InstanceType<typeof GitHub>;

export default async function updateComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  commentId: number,
  body: string,
): Promise<void> {
  await octokit.rest.issues.updateComment({
    owner,
    repo,
    comment_id: commentId,
    body,
  });
}

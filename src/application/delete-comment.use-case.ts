import { GitHub } from '@actions/github/lib/utils';

type Octokit = InstanceType<typeof GitHub>;

export default async function deleteComment(
  octokit: Octokit,
  owner: string,
  repo: string,
  commentId: number,
): Promise<void> {
  await octokit.rest.issues.deleteComment({
    owner,
    repo,
    comment_id: commentId,
  });
}

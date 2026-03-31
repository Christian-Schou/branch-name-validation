import { GitHub } from '@actions/github/lib/utils';

type Octokit = InstanceType<typeof GitHub>;

export default async function addLabel(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  label: string,
): Promise<void> {
  await octokit.rest.issues.addLabels({
    owner,
    repo,
    issue_number: issueNumber,
    labels: [label],
  });
}

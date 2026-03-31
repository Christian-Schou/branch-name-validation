import * as core from '@actions/core';
import { GitHub } from '@actions/github/lib/utils';

type Octokit = InstanceType<typeof GitHub>;

export default async function removeLabel(
  octokit: Octokit,
  owner: string,
  repo: string,
  issueNumber: number,
  label: string,
): Promise<void> {
  try {
    await octokit.rest.issues.removeLabel({
      owner,
      repo,
      issue_number: issueNumber,
      name: label,
    });
  } catch (err: unknown) {
    // 404 means the label was never applied — that's fine
    if ((err as { status?: number }).status !== 404) {
      core.warning(`⚠️  Failed to remove label "${label}": ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

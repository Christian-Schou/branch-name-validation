import * as core from '@actions/core';
import * as github from '@actions/github';
import { checkBranch } from './application/check-branch.use-case';

async function run(): Promise<void> {
  try {
    const token = core.getInput('github_token');
    if (!token) {
      core.setFailed('❌ github_token is not set');
      return;
    }

    const octokit = github.getOctokit(token);
    const { context } = github;

    const pullRequest = context.payload.pull_request;
    if (!pullRequest) {
      core.setFailed('❌ This action must be run in a pull_request event context');
      return;
    }

    const { owner, repo } = context.repo;

    await checkBranch(octokit, {
      owner,
      repo,
      prNumber: pullRequest.number,
      branchName: pullRequest.head.ref as string,
      actor: context.actor,
    });
  } catch (error) {
    core.setFailed(`❌ Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();

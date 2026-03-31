import { describe, it, expect } from 'vitest';
import suggestBranchName from '../application/suggest-branch-name.use-case';

describe('suggestBranchName', () => {
  const pattern = '^(feature|fix|chore)/.+';

  it('lowercases the branch name', () => {
    expect(suggestBranchName('JIRA-123-My-Feature', pattern)).toBe('feature/jira-123-my-feature');
  });

  it('replaces spaces with hyphens', () => {
    expect(suggestBranchName('my feature branch', pattern)).toBe('feature/my-feature-branch');
  });

  it('replaces underscores with hyphens', () => {
    expect(suggestBranchName('my_feature_branch', pattern)).toBe('feature/my-feature-branch');
  });

  it('strips special characters', () => {
    expect(suggestBranchName('my@feature!branch', pattern)).toBe('feature/myfeaturebranch');
  });

  it('does not double-prepend when prefix already present', () => {
    expect(suggestBranchName('feature/my-thing', pattern)).toBe('feature/my-thing');
  });

  it('does not prepend prefix when pattern has no alternation group', () => {
    expect(suggestBranchName('My Branch', '.+')).toBe('my-branch');
  });

  it('preserves existing slashes', () => {
    expect(suggestBranchName('fix/MY_THING/extra', pattern)).toBe('fix/my-thing/extra');
  });
});

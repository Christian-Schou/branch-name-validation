import {
  describe, it, expect, vi, beforeEach,
} from 'vitest';

import * as core from '@actions/core';
import parseInputs from '../application/parse-inputs.use-case';

// Mock @actions/core before importing the module under test
vi.mock('@actions/core', () => ({
  getInput: vi.fn(),
  setFailed: vi.fn(),
}));

function mockInputs(overrides: Record<string, string> = {}) {
  vi.mocked(core.getInput).mockImplementation((name: string) => overrides[name] ?? '');
}

describe('parseInputs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns defaults for optional inputs', () => {
    mockInputs({ branch_pattern: '^feature/.+' });
    const inputs = parseInputs();
    expect(inputs.branchPattern).toBe('^feature/.+');
    expect(inputs.failIfInvalidBranchName).toBe(false);
    expect(inputs.ignoreBranchPatterns).toEqual([]);
    expect(inputs.skipDependabot).toBe(true);
  });

  it('wraps a simple prefix list into a full regex', () => {
    mockInputs({ branch_pattern: 'feature|fix|chore' });
    const inputs = parseInputs();
    expect(inputs.branchPattern).toBe('^(feature|fix|chore)/.+');
  });

  it('passes a raw regex starting with ^ through unchanged', () => {
    mockInputs({ branch_pattern: '^(feature|fix)/.+' });
    const inputs = parseInputs();
    expect(inputs.branchPattern).toBe('^(feature|fix)/.+');
  });

  it('splits comma-separated ignore patterns', () => {
    mockInputs({ branch_pattern: '.+', ignore_branch_pattern: '^release/,^hotfix/' });
    const inputs = parseInputs();
    expect(inputs.ignoreBranchPatterns).toEqual(['^release/', '^hotfix/']);
  });

  it('splits newline-separated ignore patterns', () => {
    mockInputs({ branch_pattern: '.+', ignore_branch_pattern: '^release/\n^hotfix/' });
    const inputs = parseInputs();
    expect(inputs.ignoreBranchPatterns).toEqual(['^release/', '^hotfix/']);
  });

  it('parses fail_if_invalid_branch_name=true correctly', () => {
    mockInputs({ branch_pattern: '.+', fail_if_invalid_branch_name: 'true' });
    const inputs = parseInputs();
    expect(inputs.failIfInvalidBranchName).toBe(true);
  });

  it('parses skip_dependabot=false correctly', () => {
    mockInputs({ branch_pattern: '.+', skip_dependabot: 'false' });
    const inputs = parseInputs();
    expect(inputs.skipDependabot).toBe(false);
  });

  it('throws when branch_pattern is missing', () => {
    mockInputs({});
    expect(() => parseInputs()).toThrow(/branch_pattern/);
  });
});

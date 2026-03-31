import { describe, it, expect } from 'vitest';
import { renderTemplate } from '../application/render-template.use-case';

describe('renderTemplate', () => {
  const vars = {
    branch_name: 'feature/my-branch',
    branch_pattern: '^(feature|fix)/.+',
    pr_number: '42',
    pr_author: 'octocat',
  };

  it('replaces all four variables', () => {
    const template = '{{branch_name}} {{branch_pattern}} #{{pr_number}} by {{pr_author}}';
    expect(renderTemplate(template, vars)).toBe(
      'feature/my-branch ^(feature|fix)/.+ #42 by octocat',
    );
  });

  it('replaces multiple occurrences of the same variable', () => {
    const template = '{{branch_name}} and {{branch_name}}';
    expect(renderTemplate(template, vars)).toBe(
      'feature/my-branch and feature/my-branch',
    );
  });

  it('leaves unknown placeholders untouched', () => {
    const template = '{{unknown}} {{branch_name}}';
    expect(renderTemplate(template, vars)).toBe(
      '{{unknown}} feature/my-branch',
    );
  });

  it('returns the template unchanged when there are no variables', () => {
    const template = 'No variables here.';
    expect(renderTemplate(template, vars)).toBe('No variables here.');
  });
});

export const COMMENT_SENTINEL = '<!-- branch-name-validation -->';
export const COMMENT_SENTINEL_END = '<!-- end-branch-name-validation -->';

export const DEFAULT_INVALID_COMMENT_TEMPLATE = `${COMMENT_SENTINEL}
> [!CAUTION]
> ## ❌ Invalid branch name
>
> @{{pr_author}} — the branch \`{{branch_name}}\` does not follow the naming conventions for this repository.
>
> **Required pattern:** \`{{branch_pattern}}\`
>
> **Suggested name:** \`{{suggestion}}\`
>
> Please rename your branch before merging.

**To rename your branch, run:**
\`\`\`sh
git branch -m {{branch_name}} {{suggestion}}
git push origin {{suggestion}}
git push origin --delete {{branch_name}}
\`\`\`
${COMMENT_SENTINEL_END}`;

export const DEFAULT_SUCCESS_COMMENT_TEMPLATE = `${COMMENT_SENTINEL}
> [!TIP]
> ## ✅ Branch name valid
>
> The branch \`{{branch_name}}\` follows the naming conventions for this repository.
${COMMENT_SENTINEL_END}`;

export const DEFAULT_SKIP_COMMENT_TEMPLATE = `${COMMENT_SENTINEL}
> [!IMPORTANT]
> ## ⏭️ Branch check skipped
>
> The branch \`{{branch_name}}\` has been excluded from branch name validation.
${COMMENT_SENTINEL_END}`;

/** @deprecated Use DEFAULT_INVALID_COMMENT_TEMPLATE */
export const DEFAULT_COMMENT_TEMPLATE = DEFAULT_INVALID_COMMENT_TEMPLATE;

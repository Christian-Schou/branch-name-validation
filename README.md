# 🌿 Branch Name Validator

A GitHub Action that enforces branch naming conventions on pull requests. When a branch doesn't match your pattern the action posts a colour-coded PR comment, applies a label, optionally blocks merging via a PR review, and writes a job summary — all updated in-place on every push.

![Static Badge](https://img.shields.io/badge/PRs-welcome-orange) ![Static Badge](https://img.shields.io/badge/License-MIT-pink) ![Static Badge](https://img.shields.io/badge/Node-24-green) ![GitHub Repo stars](https://img.shields.io/github/stars/Christian-Schou/branch-name-validation)

---

## Features

- **Colour-coded PR comments** — red (`[!CAUTION]`) for invalid, green (`[!TIP]`) for valid, purple (`[!IMPORTANT]`) for skipped; updated in-place on every push
- **Branch name suggestion** — automatically derives a corrected branch name and includes git rename instructions in the invalid comment
- **Label management** — adds a configurable label when invalid, removes it when the branch becomes valid
- **PR review blocking** — optionally submits a `REQUEST_CHANGES` review to block merging and dismisses it when the branch is fixed
- **Named capture group outputs** — expose values like `branch_type` and `ticket_id` from your pattern to downstream steps
- **Ticket ID enforcement** — optionally require a non-empty `ticket` capture group via `require_ticket_id`
- **PR title validation** — optionally validate the PR title against the same pattern via `check_pr_title`
- **Length constraints** — optionally enforce a minimum and/or maximum branch name length via `min_length` / `max_length`
- **Custom comment templates** — override any of the three comment templates with your own Markdown
- **Multiple ignore patterns** — skip branches matching comma- or newline-separated patterns
- **Dependabot skip** — Dependabot branches are skipped by default
- **Job summary** — writes a summary table to the GitHub Actions job summary page

---

## Inputs

| Input | Required | Default | Description |
|---|---|---|---|
| `github_token` | | `${{ github.token }}` | GitHub token used to call the API. The built-in token is used by default |
| `branch_pattern` | ✅ | — | Simple prefix list (`feature\|fix\|chore`) or a raw regex starting with `^`. See [Branch pattern](#branch-pattern) below |
| `fail_if_invalid_branch_name` | | `false` | Set to `true` to fail the action when the branch name is invalid |
| `ignore_branch_pattern` | | — | Regex patterns for branches to skip entirely. Accepts one pattern or multiple separated by commas or newlines |
| `invalid_label` | | `invalid-branch-name` | Label applied to the PR when invalid and removed when valid. Set to an empty string to disable |
| `skip_dependabot` | | `true` | Set to `false` to also check Dependabot branches |
| `use_pr_review` | | `false` | Set to `true` to submit a blocking `REQUEST_CHANGES` review when invalid and approve/dismiss it when valid |
| `min_length` | | — | Minimum character length for the branch name. Leave empty to disable |
| `max_length` | | — | Maximum character length for the branch name. Leave empty to disable |
| `check_pr_title` | | `false` | Set to `true` to also validate the PR title using the same `branch_pattern` |
| `require_ticket_id` | | `false` | Set to `true` to require a non-empty `ticket` named capture group in the pattern |
| `invalid_comment_template` | | — | Custom Markdown template for the invalid-branch comment. See [Custom templates](#custom-templates) |
| `success_comment_template` | | — | Custom Markdown template for the valid-branch comment. See [Custom templates](#custom-templates) |
| `skip_comment_template` | | — | Custom Markdown template for the skipped-branch comment. See [Custom templates](#custom-templates) |

---

## Outputs

| Output | Description |
|---|---|
| `is_valid` | `"true"` if the branch name matches the pattern, `"false"` otherwise |
| `was_skipped` | `"true"` if the check was skipped (Dependabot or ignore pattern match) |
| `branch_type` | Value of the named capture group `type` in `branch_pattern` (empty string if not present) |
| `ticket_id` | Value of the named capture group `ticket` in `branch_pattern` (empty string if not present) |

---

## Branch pattern

You can supply `branch_pattern` in two forms:

**Simple prefix list** (recommended) — just list the allowed prefixes separated by `|`:

```
feature|fix|chore|docs
```

The action automatically converts this to `^(feature|fix|chore|docs)/.+`, requiring branches to be in the form `prefix/description`.

**Raw regex** — if your value starts with `^` it is used exactly as written:

```
^(feature|fix)/[A-Z]+-\d+-.+$
```

---

## Usage

### Basic example

```yaml
name: 🚦 Branch name validation

on:
  pull_request:
    types: [opened, synchronize, reopened, edited]

jobs:
  check-branch:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - name: Check branch name
        uses: Christian-Schou/branch-name-validation@v1.1.0
        with:
          branch_pattern: 'feature|fix|chore|docs'
```

### Block merging with a PR review

```yaml
- name: Check branch name
  uses: Christian-Schou/branch-name-validation@v1.1.0
  with:
    branch_pattern: 'feature|fix|chore'
    use_pr_review: 'true'
    fail_if_invalid_branch_name: 'true'
```

Requires **Settings → Branches → Branch protection → Require a pull request before merging → Required approving reviews** to be enabled so the `REQUEST_CHANGES` review can actually block the PR.

### Jira ticket enforcement

Require every branch to include a Jira ticket reference (e.g. `feature/PROJ-123-my-description`). The `ticket_id` output is then available to downstream steps — handy for auto-linking PRs or posting Jira comments:

```yaml
name: 🚦 Branch name validation

on:
  pull_request:
    types: [opened, synchronize, reopened, edited]

jobs:
  check-branch:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
    steps:
      - name: Check branch name
        id: branch-check
        uses: Christian-Schou/branch-name-validation@v1.1.0
        with:
          branch_pattern: '^(?<type>feature|fix|chore)/(?<ticket>[A-Z]+-\d+)-.+$'
          require_ticket_id: 'true'
          fail_if_invalid_branch_name: 'true'

      - name: Comment on Jira ticket
        if: steps.branch-check.outputs.is_valid == 'true'
        run: |
          echo "Updating Jira ticket ${{ steps.branch-check.outputs.ticket_id }}"
          # curl -X POST https://your-org.atlassian.net/rest/api/3/issue/${{ steps.branch-check.outputs.ticket_id }}/comment ...
```

> [!NOTE]
> Named capture groups require a raw regex (starting with `^`). The two built-in group names are `type` → `branch_type` output and `ticket` → `ticket_id` output.

### Named capture groups and downstream outputs

Use named capture groups (`?<name>`) in your pattern to extract values and use them in later steps. Named capture groups require a raw regex (starting with `^`):

```yaml
- name: Check branch name
  id: branch-check
  uses: Christian-Schou/branch-name-validation@v1.1.0
  with:
    branch_pattern: '^(?<type>feature|fix)/(?<ticket>[A-Z]+-\d+)-.+$'

- name: Use outputs
  run: |
    echo "Branch type: ${{ steps.branch-check.outputs.branch_type }}"
    echo "Ticket ID:   ${{ steps.branch-check.outputs.ticket_id }}"
```

### Validate the PR title too

Use `check_pr_title: 'true'` to apply the same pattern to the PR title. Both the branch name and the title must be valid for the check to pass:

```yaml
- name: Check branch name
  uses: Christian-Schou/branch-name-validation@v1.1.0
  with:
    branch_pattern: 'feature|fix|chore'
    check_pr_title: 'true'
```

### Length constraints

```yaml
- name: Check branch name
  uses: Christian-Schou/branch-name-validation@v1.1.0
  with:
    branch_pattern: 'feature|fix|chore'
    min_length: '10'
    max_length: '80'
```

### Multiple ignore patterns

```yaml
- name: Check branch name
  uses: Christian-Schou/branch-name-validation@v1.1.0
  with:
    branch_pattern: '^(feature|fix)/.+'
    ignore_branch_pattern: |
      ^release/
      ^hotfix/
      ^renovate/
```

Patterns can also be comma-separated on a single line: `^release/,^hotfix/,^renovate/`.

---

## PR comments

The action posts one comment per PR and updates it in-place on every push. The comment style depends on the outcome:

| Outcome | Style | Content |
|---|---|---|
| Invalid branch | 🔴 `[!CAUTION]` | Branch name, required pattern, suggested name, git rename instructions, `@author` mention |
| Valid branch | 🟢 `[!TIP]` | Confirmation message with branch name |
| Skipped | 🟣 `[!IMPORTANT]` | Branch name and reason for skipping |

### Custom templates

You can override any comment template using the `invalid_comment_template`, `success_comment_template`, or `skip_comment_template` inputs. Templates support the following variables:

| Variable | Description |
|---|---|
| `{{branch_name}}` | The current branch name |
| `{{branch_pattern}}` | The configured pattern |
| `{{suggestion}}` | Suggested corrected branch name (invalid template only) |
| `{{validation_reasons}}` | Bullet list of all validation failures (invalid template only) |
| `{{pr_author}}` | GitHub username of the PR author |
| `{{pr_number}}` | The PR number |
| `{{pr_title}}` | The PR title |
| `{{type}}`, `{{ticket}}`, … | Any named capture groups from `branch_pattern` |

> [!IMPORTANT]
> Custom templates must include the sentinel comments `<!-- branch-name-validation -->` and `<!-- end-branch-name-validation -->` so the action can find and update the comment on subsequent pushes.

**Example:**

```yaml
- name: Check branch name
  uses: Christian-Schou/branch-name-validation@v1.1.0
  with:
    branch_pattern: 'feature|fix'
    invalid_comment_template: |
      <!-- branch-name-validation -->
      > [!CAUTION]
      > ❌ Hey @{{pr_author}}, `{{branch_name}}` doesn't follow our naming rules.
      >
      > Please rename it to something like `{{suggestion}}`.
      <!-- end-branch-name-validation -->
```

---

## Required permissions

The action needs `pull-requests: write` to post and update comments. If `use_pr_review: 'true'` is set, it also needs `pull-requests: write` for submitting reviews (covered by the same permission).

```yaml
permissions:
  pull-requests: write
```

---

## Contributing

Contributions are welcome — open a pull request with your proposed changes.


## Feature Requests

Got an idea to an awesome feature? Please let me know by opening a new issue and label it with feature-request and describe what you would like to see from this action.
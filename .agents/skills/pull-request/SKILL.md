---
name: pull-request
description: 自动对比当前分支相对于 master 的差异，推送代码，并使用 `gh` 命令以英文编写标题和描述创建 Pull Request。在用户请求提交 PR、总结更改或推送分支到主库时使用。
---

# Pull Request Creation Workflow

This skill automates the process of creating a Pull Request from the current branch to `master` (or the default base branch) using the GitHub CLI (`gh`).

## Core Objectives

1.  **Analyze Diffs**: Compare the current branch with the target base branch (`master` by default) to understand what has changed.
2.  **Generate Content**: Write a high-quality PR title and description in **English**, following standard engineering practices (Overview, Key Changes, Verification).
3.  **Ensure Sync**: Always push the local branch to the remote origin before creating the PR.
4.  **Create PR**: Use `gh pr create` to finalize the process.

## Step-by-Step Instructions

### 1. Research & Analysis
- Determine the current branch name: `git branch --show-current`.
- Verify the status and recent history: `git status && git log -n 5`.
- Analyze the functional changes against the base branch: `git diff master..HEAD --stat`. If the base branch is different, ask the user or check repo defaults.

### 2. Strategy & Preparation
- If there are uncommitted changes, ask the user to commit or stash them first.
- Ensure the branch is pushed: `git push origin <current-branch>`.

### 3. Generate PR Content (English Only)
Draft the title and body in English:
- **Title**: Use conventional commit style, e.g., `feat(ui): add new dashboard`, `fix(auth): resolve session timeout`.
- **Body**: 
  - `## Overview`: A brief summary of the purpose.
  - `## Key Changes`: Bullet points describing specific implementation details.
  - `## Verification`: How the changes were tested.

### 4. Execution
- Call `gh pr create` with the generated title and body.
- If `gh` is not in the `PATH`, look for it in common locations like `/opt/homebrew/bin/gh` or `/usr/local/bin/gh`.
- Default flags: `--base master --head <current-branch> --web=false`.

## Example Command
```bash
gh pr create --title "feat(observability): implement tracing" --body "## Overview..." --base master --head feat/branch-name
```

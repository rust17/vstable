---
name: release
description: 用于 vstable 项目发布的技能。支持同步更新 frontend 和 tauri 版本号、运行本地测试、自动创建并推送版本标签。
---

# Release 技能使用指南

本技能通过自动化核心发布流程，确保 vstable 的前端与 Tauri 桌面端版本同步，并触发 CI/CD 发布流程。

## 核心流程

请遵循以下步骤进行发布：

### 1. 状态检查 (Pre-check)
在开始发布前，请确保当前 Git 工作目录是干净的（没有未提交的变更），工作分支是 master。
```bash
git status
```

### 2. 创建发布分支，如 `release-v1.2.0`。
```bash
git checkout -b release-<new_version>
```

### 3. 版本升级 (Bump Version)
使用脚本同步更新 `frontend/package.json` 和 `frontend/tauri/tauri.conf.json` 中的版本号。
```bash
node skills/release/scripts/bump-version.js <new_version>
```

### 4. 提交并标记 (Commit & Tag)
提交版本更新并创建以 `v` 开头的标签，这将触发 GitHub Actions 自动构建和发布。
```bash
git add frontend/package.json && git add frontend/tauri/tauri.conf.json
git commit -m "chore: release v<new_version>"
git checkout master
git merge --no-ff --no-edit release-<new_version>
git tag v<new_version>
git push --tags
```

## 触发场景
当您准备发布一个新版本（正式版或 Pre-release）时触发此技能。

## 资源说明
- `scripts/bump-version.js`: 用于同步多处版本号的 Node.js 脚本。

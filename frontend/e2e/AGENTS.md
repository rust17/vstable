# Agent Context: Frontend E2E Tests

> **ATTENTION AI AGENTS & DEVELOPERS:**  
> 此目录 `frontend/e2e/` 包含了保证 `vstable` 核心链路稳定性的最重要防线。在编写和维护测试用例时，请严格遵守本文件定义的真实全链路测试规范。

## 1. Core Logic & Testing Philosophy

**真实环境，拒绝重度 Mock (Real Environment over Heavy Mocks)**
- 本项目的 E2E 测试基于 Playwright 框架。
- 在测试启动前，`global-setup.ts` 会自动拉起真实的 Docker 数据库（PostgreSQL/MySQL）以及**真实的 Go Engine 后台进程**。
- 得益于目前的 gRPC-Web 直连架构，运行在 Playwright 浏览器实例中的 React 前端将**直接发送 HTTP 请求**到真实 Go Engine。
- **核心逻辑**：通过真实的 AST 解析、真实的 Schema Diff 生成和真实的数据库 DDL 执行，来验证 UI 的正确性。

## 2. Hard Rules for AI Agents (E2E Layer)

在编写 E2E 测试代码时，必须遵守以下铁律：

- **[RULE 1] 禁止拦截和 Mock 数据库网络请求**：
  - 不得在 `fixture.ts` 或具体的测试用例中使用 `page.route` 或 `__playwright_invoke` 去模拟 `db_connect`, `db_query`, `sql_generate_alter` 等业务操作。
  - 所有业务请求必须畅通无阻地打到后端的 `localhost:39082`。
- **[RULE 2] 仅 Mock 必要的系统原生能力 (Tauri IPC)**：
  - 测试用例必须从 `import { test, expect } from './fixture'` 导入。
  - `fixture.ts` 的唯一职责是拦截 `window.__TAURI_INTERNALS__.invoke`，以 Mock 掉那些在无头浏览器中不存在的原生调用（例如：窗口最大化 `window_toggle_maximize`、持久化存储 `tauri-plugin-store`）。
- **[RULE 3] 异步断言与稳定性保障 (Async Resilience)**：
  - 由于走真实的数据库交互，网络和 SQL 执行会有延迟。
  - 必须使用 `expect(...).toPass()` 配合重试机制，或者使用 `page.waitForResponse` 等待对应的 gRPC-Web 响应，绝不允许使用 `page.waitForTimeout` 硬编码死等。
- **[RULE 4] 测试环境隔离 (Test Isolation)**：
  - 每个测试用例在执行 DDL 操作（建表、删列）时，必须使用带有随机后缀或时间戳的 Table Name，避免测试并发执行或重复执行时产生的脏数据冲突。

## 3. Test Matrix (Key Flows to Verify)

维护或新增功能时，必须确保覆盖以下链路：

- **Connection Management (连接与认证)**:
  - PostgreSQL 与 MySQL 的登录连通性。错误密码的拦截与 Alert 提示。
- **Schema Designer (架构设计器)**:
  - S-01: 可视化添加列（主键、类型、长度）、预览 DDL 语句是否生成准确。
  - S-02: 提交应用后，数据库 Navigator 树是否能正确拉取并显示新表。
- **Data Grid (数据操作)**:
  - 插入新行 (Add Row)、内联单元格更新 (Inline Update)、删除数据行。
- **Advanced UI Interactions**:
  - SQL Console 多标签页执行、数据表的客户端级 Pagination（分页）与字段过滤（Filter Bar）。

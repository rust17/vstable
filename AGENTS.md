# vstable

## Quick commands

- `cd frontend && npm run dev` (拉起双端开发环境：Tauri + Go Engine)
- `cd frontend && npm run dev-frontend` (仅启动前端 Vite，不启动 Tauri/Go，适合纯 UI 调试)
- `cd frontend && npm run build` (编译前端与后端二进制)
- `cd frontend && npm run test` (Vitest 单元测试)
- `cd frontend && npm run test:e2e` (Playwright 全链路测试，会先 build)
- `cd frontend && npm run check` (Biome 格式化与静态检查)
- `cd frontend && npm run docker:up` (启动测试所需的 PG/MySQL 容器)
- `cd frontend && npm run docker:down` (停止并清理测试容器)
- `cd backend && go test -v ./...` (后端集成测试，需 Docker)
- `cd backend && ./scripts/gen_proto.sh` (生成 gRPC 代码)

## Project overview

vstable 是一款专为开发者设计的现代数据库管理工具，支持可视化表结构设计与高性能 SQL 查询。其核心设计目标是“状态对齐”，即通过对比新旧 AST（抽象语法树）生成精确的数据库变更语句。

## Tech stack

- **Frontend**: React 19 (TypeScript), TailwindCSS 4.0, Monaco Editor
- **Desktop Runtime**: Tauri 2.0 (Rust), Vite
- **Backend Engine**: Go 1.24 (vstable-engine)
- **Communication**: gRPC, Protocol Buffers (Strict types)
- **Database Drivers**: `pgx/v5` (PostgreSQL), `go-sql-driver/mysql` (MySQL)
- **Testing**: Playwright (E2E), Vitest (Unit), Go test (Integration)
- **Infrastructure**: Docker Compose (Database testing environments)

## Architecture overview

该项目采用解耦的三层架构：
1. **Frontend (React)**: 基于 React 19、TailwindCSS 4.0 和 Monaco Editor 构建的现代用户界面。负责处理用户交互、SQL 编辑以及可视化的表结构设计。
2. **Desktop Runtime (Tauri)**: 作为操作系统与 Web 内容之间的桥梁。基于 Rust 的核心层负责管理 Go 引擎（Sidecar）的生命周期、处理由前端发起的高性能 IPC 请求，并通过原生的能力（Capabilities）系统提供持久化存储和窗口管理。
3. **Backend Engine (Go)**: 一个使用 Go 1.24 编写的高性能守护进程。它在本地作为 Tauri Sidecar 运行并向 Rust 核心暴露 gRPC API（定义于 `vstable.proto`）。它承担繁重的计算任务，包括数据库连接管理、AST 解析，以及基于状态对齐进行 Schema Diff 并生成精确的 DDL 语句。

## Major modules and interfaces

- **Go Engine (`backend/`)**:
  - `internal/ast`: 核心 Schema Diff 引擎。提供 AST 类型定义以及特定数据库方言（PostgreSQL/MySQL）的编译器，用于基于状态对齐生成精确的 DDL Diff。
  - `internal/db`: 数据库连接管理器和驱动程序抽象。
  - `main.go`: 启动 gRPC Server，处理来自 Tauri Rust 核心的远程过程调用。
  - `scripts/gen_proto.sh`: 构建脚本，用于从 `.proto` 文件生成 Go 代码。
- **Tauri Core (`frontend/tauri/`)**:
  - `src/lib.rs`: Tauri 应用的核心库。初始化 gRPC 客户端池以通过严格类型的 Protobuf 协议与后端引擎通信；处理前端的 IPC 路由（如 `db_connect`, `db_query`），以及原生窗口控制和日志捕获。
  - `src/main.rs`: 桌面应用启动入口。
  - `tauri.conf.json`: 应用配置，包括构建指令、窗口属性以及 Sidecar （Go 引擎）的绑定声明。
- **React Renderer (`frontend/src/`)**:
  - `features/`: 包含核心功能模块：
    - `connection`: 数据库连接表单和管理。
    - `navigator`: 数据库和数据表树形视图。
    - `query-editor`: 基于 Monaco 的 SQL 执行环境。
    - `schema-designer`: 可视化的表结构修改器。
    - `table-viewer`: 用于查看和编辑表数据的数据网格。
  - `api/`: 通过 IPC 与主进程进行通信的 API 客户端。

## Repo map

- `backend/`: Go 后端引擎源码。
  - `internal/ast/`: AST 类型、Diff 逻辑以及数据库方言编译器。
  - `internal/db/`: 数据库驱动实现。
- `frontend/`: Tauri 应用与 React 前端。
  - `e2e/`: 用于全链路验证的 Playwright E2E 测试。
  - `tauri/`: Tauri 胶水代码，将 frontend 和 backend 粘合在一起。
  - `src/`: React Web 应用。
    - `components/`: 可复用的通用 UI 组件。
    - `features/`: 特定领域的业务逻辑与视图。
    - `hooks/`, `stores/`: 全局状态管理 (Zustand) 和自定义 React Hooks。
- `requirement/`: 产品需求、设计文档和待办事项列表。

## Conventions and quality

- **代码风格**:
  - 前端：TypeScript 严格模式，Biome。
  - 后端：Go 1.24 标准风格。
- **测试驱动**:
  - 新功能必须包含单元测试（Vitest）。
  - DDL 方言修改必须通过后端集成测试（`go test`）。
  - 关键路径（连接、查询、同步）必须覆盖 E2E 测试。
- **全链路验证**:
  - 自动完成 Docker 环境拉起、引擎预编译、模拟用户操作。
  - 双向对齐验证：在后端维护同步化的集成测试，确保生成的 DDL 在真实数据库中执行一致。
- **UI 渲染稳定性**:
  - 对于包含 Monaco Editor 等对 DOM 物理位置敏感的组件，在实现排序功能时必须采用“稳定 DOM 排序”策略。
  - 即 DOM 物理顺序按 ID 保持固定，与 UI 显示顺序解耦，仅通过切换可见性而非物理移动 DOM 节点来处理排序。
- **类型安全性**: 贯穿前端 UI 到后端 AST 编译器的强类型约束。

## Git commit messages

采用 Conventional Commits 格式:

```text
<type>(<scope>): <subject>
```

Allowed types:
`feat`, `fix`, `test`, `refactor`, `chore`, `style`, `docs`, `perf`, `build`, `ci`, `revert`.

## Versioning

项目遵循语义化版本控制 (`MAJOR.MINOR.PATCH`):

- **Patch** 版本仅用于向后兼容的 Bug 修复。
- **Minor** 版本用于新增向后兼容的功能和改进。
- **Major** 版本用于破坏性或不兼容的 API 变更。

## Release workflow

1. 确保 `master` 分支代码已更新 (pull latest)。
2. 创建发布分支，如 `release-v1.2.0`。
3. 更新 `frontend/package.json` 中的版本号。
4. 运行全链路测试 (`npm run test:e2e` 与 `go test ./...`) 确保版本稳定性。
5. 提交变更并创建 PR。
6. PR 合并后，切换回 `master` 分支并拉取最新代码。
7. 建立标签并推送:
   - `git tag v1.2.0`
   - `git push --tags`
8. GitHub Actions 或相关 CI/CD 流程在检测到 tag 推送后，自动构建双端产物（Tauri Mac/Windows/Linux 与 Go Engine 二进制）并执行发布。

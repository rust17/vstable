# QuickPG 架构实现原理

## 项目目录结构
```text
QuickPG/
├── backend/                # Go 核心引擎
│   ├── internal/
│   │   ├── ast/           # SQL 编译器与方言适配逻辑
│   │   └── db/            # 数据库驱动与连接池管理
│   └── main.go             # 引擎入口 (HTTP Server)
├── frontend/               # Electron 前端应用
│   ├── e2e/               # 端到端集成测试
│   ├── src/
│   │   ├── main/          # Electron 主进程 (守护进程管理、IPC 代理)
│   │   ├── preload/       # 预加载脚本 (API 暴露)
│   │   └── renderer/      # React 渲染进程 (UI 界面)
│   ├── package.json       # 项目依赖与脚本
│   └── playwright.config.ts # E2E 测试配置
├── docker-compose.yml     # 用于集成测试的 PG/MySQL 容器配置
└── AGENTS.md              # 架构设计与原理文档
```

## 核心架构
三层架构 (React + Electron Proxy + Go Engine)

### 1. 表现层 (Renderer) - `frontend/src/renderer/`
- **响应式 UI**：基于 React 18/19，通过 `window.api` 异步调用后端服务。
- **元数据驱动**：通过 `Capabilities` 接口适配不同数据库的方言差异（如 MySQL 无 Schema、PG 的引号差异）。
- **组件库**：
    - `data-grid/`: 高性能虚拟滚动表格，处理 `QueryResult` 中的 `rows` 与 `fields` 渲染。
    - `schema-designer/`: 可视化表设计器，产出结构化的变更 Intent。

### 2. 桌面代理层 (Main/Preload) - `frontend/src/main/` & `src/preload/`
- **进程生命周期 (`daemon.ts`)**：Electron 启动时通过 `DaemonManager` 动态拉起 `backend/` 的 Go 二进制进程（开发模式下使用 `go run`），并在退出时自动清理。
- **IPC 代理 (`index.ts`)**：作为反向代理，将前端 IPC 请求转换为本地 HTTP 请求转发给 Go 引擎（默认端口 `39082`）。
- **DSN 构建**：在此层完成前端 UI 配置向数据库方言特定 DSN 字符串的转换。

### 3. 核心引擎层 (Backend Engine) - `backend/`
- **连接池管理 (`internal/db/`)**：使用 Go 原生驱动 (`pgx/v5`, `go-sql-driver/mysql`) 实现。
- **AST 编译器 (`internal/ast/`)**：
    - **逻辑对齐**：通过 `Original` 字段实现新旧状态对比，生成精准的 `ALTER` 语句。
    - **MySQL 特色支持**：实现基于“前驱节点对比”的相对位置位移算法（`FIRST`/`AFTER`），避免冗余更新。
    - **全面支持**：覆盖了 `Type`、`Length`、`Nullable`、`Default`、`Comment` 以及 `Primary Key` 和 `Auto Increment` (MySQL) 的生成与修改逻辑。

## 关键技术特性
- **高性能查询**：Go 协程并发处理，查询结果直接以 JSON 返回，主进程不参与大对象序列化，避免 OOM。
- **双向对齐测试**：在 `backend/internal/ast/` 下维护了同步化的集成测试，确保两端 DDL 在 Docker 真实环境中的执行一致性。
- **类型自动格式化**：后端 `formatType` 函数根据方言自动处理类型精度（如 `varchar` -> `varchar(255)`）。

## 验证与质量
- **后端集成测试**：`cd backend && go test -v ./internal/ast/...` (需 Docker 环境)，验证 DDL 语法生成的正确性。
- **前端单元测试**：`cd frontend && npm test` (Vitest)，验证 UI 组件逻辑。
- **全链路 E2E 测试**：`cd frontend && npm run test:e2e` (Playwright)，自动完成：
    - Docker 数据库环境拉起（PostgreSQL 5433, MySQL 3307）。
    - Go 引擎二进制文件预编译，确保进程管理稳定性。
    - 模拟用户真实点击、连接及查询流程，覆盖 Electron 与核心引擎的 IPC 交互。
- **开发运行**：`cd frontend && npm run dev` (自动拉起双端)。

---
*设计哲学：极致解耦、位置敏感、全链路验证。*

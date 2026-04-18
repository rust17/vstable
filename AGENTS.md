# Agent Context: vstable Root

> **ATTENTION AI AGENTS & DEVELOPERS:**  
> 本文件是 `vstable` 项目的**全局**开发指南。请作为所有子目录操作的最高纲领。各独立模块的详细业务逻辑与特定规则，请参阅对应目录下的 `AGENTS.md`。

## 1. Project Overview & Core Logic

`vstable` 是一款专为开发者设计的现代数据库管理工具，支持可视化表结构设计与高性能 SQL 查询。

**全栈核心逻辑：基于 AST 的“状态对齐” (Schema Diff Engine)**
传统数据库工具通过手动拼接 `ALTER TABLE` 语句来修改表结构。`vstable` 的核心逻辑是“状态对齐”：
1. **解析 (Parse)**：将当前的数据库表结构拉取并解析为内部统一的抽象语法树 (AST)。
2. **修改 (Mutate)**：用户在前端可视化的 React Schema Designer 中修改表结构，产生一个目标 AST（New State）。
3. **对比与生成 (Diff & Generate)**：Go 后端比较 Old AST 与 New AST，针对不同的数据库方言（PostgreSQL/MySQL），精确生成对应的 DDL 变更语句。

## 2. Global Architecture: Direct Communication

项目采用解耦的三层架构，并**强制执行**“前端直连后端”的网络通信模型：

1. **Frontend (React)**: 负责所有业务交互、可视化设计，并通过 gRPC-Web HTTP 直连后端。（详见 `frontend/AGENTS.md`）
2. **Desktop Runtime (Tauri)**: 降级为 “Thin Shell”，仅负责原生窗口控制与启动后台引擎。（详见 `frontend/tauri/AGENTS.md`）
3. **Backend Engine (Go)**: 本地守护进程（Sidecar），负责繁重的 AST 计算与数据库 I/O。（详见 `backend/AGENTS.md`）

## 3. Global Hard Rules

在为本项目编写代码时，必须遵守以下全局铁律：

- **[RULE 1] 杜绝“浅模块” (No Shallow Modules in Tauri)**：
  - 遵循 John Ousterhout 的《A Philosophy of Software Design》。
  - 严禁在 Tauri 的 Rust 核心层编写用于“透传”网络请求的中间件代码。前端必须直接向后端发起网络请求。
- **[RULE 2] Protobuf 驱动开发 (Proto-Driven)**：
  - 任何前后端交互的 API 变更，必须首发修改 `backend/api/vstable.proto`，随后运行构建脚本重新生成双端接口代码。严禁单方面 Hardcode 接口数据结构。
- **[RULE 3] 强制全链路测试保护**：
  - AST 编译或方言逻辑的变更必须通过 Go 集成测试。
  - UI 核心链路（连接、设计器、数据网格）修改必须通过 Playwright 全链路测试。（详见 `frontend/e2e/AGENTS.md`）

## 4. Quick Commands

- `cd frontend && npm run dev` (拉起双端开发环境：Tauri + Go Engine)
- `cd frontend && npm run build` (打包全平台产物)
- `cd frontend && npm run test:e2e` (执行端到端测试)
- `cd backend && go test -v ./...` (执行后端集成测试，需预先 `npm run docker:up`)
- `cd backend && ./scripts/gen_proto.sh` (生成 gRPC 代码)

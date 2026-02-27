# QuickPG 架构实现原理 (v2.0)

## 核心架构：引擎与透镜 (Engine & Lens)
遵循“逻辑引擎化、视图功能区化”原则，实现 PostgreSQL 领域逻辑与 UI 框架的彻底解耦。

### 1. 领域引擎层 (Core Engine) - `src/core/`
- **纯逻辑实现**：不依赖 React/Electron，负责 PG 协议相关的核心计算。
- **Diff 引擎 (`pg/diff.ts`)**：对比表结构状态，生成精确的 `ALTER TABLE` 语句序列。
- **数据格式化 (`pg/format.ts`)**：处理 JSON 序列化、时间戳友好显示等类型转换。

### 2. 基础设施层 (Infrastructure) - `src/infrastructure/`
- **物理连接 (`main/db-manager.ts`)**：主进程通过 `pg.Pool` 管理连接池，支持多会话隔离。
- **通信桥梁**：通过 `preload` 暴露原生接口，渲染进程通过 `providers/SessionProvider` 进行 IPC 封装。

### 3. 表现层 (Renderer) - `src/renderer/`
- **功能区 (Features)**：按业务领域聚合，实现功能闭环。
    - `navigator/`: 数据库树形导航、连接管理。
    - `workspace/`: Tab 生命周期管理、SQL 编辑器分屏。
    - `schema-designer/`: 表结构可视化设计（驱动 Core Diff 引擎）。
    - `data-viewer/`: 高性能数据查看与 DML 操作。
- **UI 原子库 (UI Kit)**：
    - `atoms/`: 基础交互单元（Button, Pagination）。
    - `overlays/`: 全局层（Modal, ContextMenu）。
    - `data-grid/`: 独立的高性能表格渲染引擎。
- **状态中心 (Providers)**：`SessionProvider` 维护全局连接上下文。

## 关键流程
- **数据加载**：`useTableData` 钩子 -> `SessionProvider.query` -> IPC -> `DbManager`。
- **结构变更**：`SchemaDesigner` 收集状态 -> `core/pg/diff` 计算 SQL -> 用户预览并执行。

---
*遵循原则：逻辑引擎化、功能区组织。如无必要，勿增实体。*

# QuickPG 架构实现原理

## 核心架构：多驱动引擎与透镜 (Multi-Driver Engine & Lens)
遵循“逻辑引擎化、视图功能区化”原则，实现数据库协议逻辑与 UI 框架的彻底解耦，支持多数据库方言。

### 1. 领域引擎层 (Core Engine) - `src/core/`
- **纯逻辑实现**：不依赖 React/Electron，通过 `DiffFactory` 调度不同数据库的计算逻辑。
- **方言 Diff 引擎 (`pg/`, `mysql/`)**：实现各方言的 `generateAlterTableSql` 等核心逻辑。
- **数据格式化 (`pg/format.ts`)**：处理不同方言的类型转换与显示逻辑。

### 2. 基础设施层 (Infrastructure) - `src/infrastructure/`
- **驱动架构 (`drivers/`)**：基于 `BaseDriver` 接口，隔离不同底层驱动（如 `pg`, `mysql2`）的连接池管理。
- **物理连接 (`db-manager.ts`)**：主进程通过驱动实例管理多数据库会话隔离。
- **通信桥梁**：通过 `preload` 暴露原生接口，渲染进程通过 `providers/SessionProvider` 进行 IPC 封装。

### 3. 表现层 (Renderer) - `src/renderer/`
- **元数据驱动 (Metadata-Driven)**：视图层通过 `Capabilities` 接口动态适配方言差异（如 MySQL 无 Schema 概念、引用符差异等）。
- **功能区 (Features)**：
    - `navigator/`: 适配多引擎的数据库/表结构展示。
    - `workspace/`: 多会话 Tab 管理。
    - `schema-designer/`: 可视化表设计器，驱动核心 Diff 工厂。
- **UI 原子库 (UI Kit)**：
    - `data-grid/`: 高性能表格渲染引擎，支持多驱动返回的数据格式。

## 关键流程
- **数据加载**：`useTableData` 钩子 -> `SessionProvider.query` -> IPC -> `DbManager` -> `Driver.query`。
- **结构变更**：`SchemaDesigner` 收集状态 -> `core/factory` 获取 `DiffEngine` -> 生成 SQL -> 用户预览并执行。

---
*遵循原则：逻辑引擎化、驱动抽象化、功能区组织。如无必要，勿增实体。*

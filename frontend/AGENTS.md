# Agent Context: Frontend (React & Web)

> **ATTENTION AI AGENTS & DEVELOPERS:**  
> 此目录 `frontend/` 包含了 vstable 的 React 客户端逻辑。在进行 UI 组件修改、状态管理调整或网络层交互时，请严格遵循本文件的开发规范。

## 1. Core Architecture & Logic

**React 19 + Vite + gRPC-Web**
前端不仅是一个展示层，它还需要承载复杂的“状态构建”任务（如可视化的 Schema 设计器）。

- **直接网络通信 (gRPC-Web)**：
  - 使用 `nice-grpc-web` 库创建 HTTP 客户端（`src/api/grpcClient.ts`）。
  - **核心链路**：绕过 Tauri IPC，直接通过 Fetch 请求向后端的 `:39082` 端口发送序列化数据。
- **全局拦截器与错误处理**：
  - 所有的网络请求错误在 `loggingAndErrorInterceptor` 中统一捕获，并提取 gRPC Status Code 转换为前端友好的 Toast/Alert。
- **状态管理 (Zustand)**：
  - `stores/` 目录中维护了全局状态（如活跃连接、当前工作区）。业务逻辑通过拆分的 Custom Hooks 消费这些状态。
- **Schema Designer 状态机**：
  - 前端负责维护表结构的 "New State"（增删改操作），在保存时将其构建为 Protobuf 结构体发送给后端进行 Diff 计算。

## 2. Business Logic Map (业务逻辑快速定位导航)

当你需要修改某个特定业务功能时，请直接前往对应的目录：

- **`src/features/connection/` (连接管理)**
  - 逻辑：处理数据库的登录信息表单、连接测试。调用 `tauri-plugin-store` 进行本地持久化。
- **`src/features/navigator/` (数据库左侧边栏树形视图)**
  - 逻辑：显示 Databases、Schemas、Tables。处理右键菜单操作（打开数据、设计表结构等）。
- **`src/features/query-editor/` (SQL 编辑器与执行台)**
  - 逻辑：基于 Monaco Editor 的多标签页 SQL 编写环境。支持快捷键执行、结果集统计、SQL 高亮。
- **`src/features/schema-designer/` (核心：可视化架构设计器)**
  - 逻辑：维护表结构的 AST 视图。支持增删列、设置主键/外键/索引、调整类型和长度。保存时触发 DDL 预览。
- **`src/features/table-viewer/` (数据网格查看器)**
  - 逻辑：用于展示表行数据。支持内联编辑 (Inline Update)、新增行、右键删除。管理分页和过滤条件构建。

## 3. Hard Rules for AI Agents (Frontend Layer)

- **[RULE 1] 严禁使用 Tauri IPC 代理业务请求**：
  - 前后端业务通信**只能**通过 `src/api/client.ts` 封装的 gRPC-Web 客户端调用。仅在需要原生系统能力（存储、窗口控制）时允许使用 Tauri IPC。
- **[RULE 2] 类型对齐强制约束**：
  - 前端请求和响应体**必须**使用 `gen_proto.sh` 生成的 TypeScript 类型。绝不允许在前端擅自 Hardcode 接口响应类型（如 `interface MyFakeResponse {}`）。
- **[RULE 3] 稳定 DOM 排序 (Stable DOM Sorting)**：
  - **红线**：Monaco Editor 对 DOM 物理位置极度敏感。在实现拖拽、Tabs 或列表排序时，必须保证真实 DOM 结构顺序不变。仅允许通过数据驱动的 CSS `display: none` 或 flex `order` 等视觉手段表现状态切换，以防 Monaco 实例销毁或内存泄露。
- **[RULE 4] UI 审美与交互标准**：
  - 使用 TailwindCSS 4.0 进行样式开发。
  - 破坏性操作必须调用全局 ConfirmModal 进行二次确认。
  - 大数据量渲染必须使用虚拟列表技术。

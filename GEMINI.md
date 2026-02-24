# 数据表格功能实现原理总结

## 核心架构
- **主进程 (Main Process)**: `DbManager` 通过 `pg` 连接池管理数据库连接，执行原生 SQL。
- **通信层 (IPC)**: `preload/index.ts` 暴露 `connect`, `query` 等接口；渲染进程通过 `SessionContext` 封装调用。
- **状态管理**: `useWorkspace` 维护标签页（Tab）生命周期及其持久化状态（分页、过滤）；`useTableData` 负责单一表格的数据流与 DML 操作。

## 关键模块实现
- **数据加载与分页**: `useTableData` 动态拼接 `SELECT ... LIMIT ... OFFSET`，并同步执行 `COUNT` 获取总行数。
- **过滤系统**: `FilterBar` 管理条件列表，`useTableData` 将其解析为 `WHERE` 子句（包含字符串转义防御）。
- **数据编辑 (DML)**: 
    - **更新/删除**: 强依赖表元数据中的主键（PK）。通过 `UPDATE/DELETE ... WHERE "pk" = 'val'` 确保操作精确性。
    - **新增**: 在 `ResultGrid` 底部渲染输入行，自动识别 `serial` 等自增字段。
- **结构管理 (DDL)**: `sql-generator.ts` 采用 **Diff 算法** 对比 `_original` 状态，生成精确的 `ALTER TABLE` 语句序列（涵盖重命名、类型转换、索引变更）。
- **元数据驱动**: 深度依赖 PostgreSQL 的 `information_schema` 获取列类型、约束和注释，驱动 UI 渲染逻辑。

## 辅助逻辑
- **格式化**: `format.ts` 处理 `JSON` 序列化和 `Timestamp` 友好显示。
- **交互渲染**: `ResultGrid` 实现粘性表头、单元格双击编辑、右键上下文菜单。

---
*遵循原则：如无必要，勿增实体。*

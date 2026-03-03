# Agent Context: Frontend E2E Tests

## Goals and Scope
- 验证 `vstable` Electron 客户端的核心 UI 交互逻辑。
- 测试重点：数据库连接管理、架构设计器（Schema Designer）、数据网格（Data Grid）CRUD、分页与过滤。
- **不在范围内**：底层的 Go 引擎单元测试、纯前端组件的 Vitest 单元测试。

## Execution Rules
- **运行命令**：在 `frontend/` 目录下执行 `npm run test:e2e`。
- **环境隔离**：
  - 必须为每个测试用例创建唯一的 `userDataDir`（使用 `fs.mkdtempSync`）。
  - 启动参数需包含 `--user-data-dir=${userDataDir}`。
- **前置依赖**：
  - `global-setup.ts` 会自动运行 `docker-compose up` 并编译后端 `vstable-engine`。
  - 测试开始前需等待 `http://127.0.0.1:39082/api/ping` 返回 OK 以确保引擎就绪。
- **最佳实践**：
  - 优先使用 `data-testid` 定位器。
  - 使用 `expect(...).toPass()` 处理异步延迟（如数据库响应或动画）。
  - 测试结束后必须调用 `electronApp.close()` 并清理临时目录。

## Test Matrix

**Connection Management**
- C-01 PostgreSQL Connection: 输入主机、端口、凭据，点击连接，表单消失并显示侧边栏。
- C-02 MySQL Connection: 切换 Dialect 为 MySQL，验证不同默认端口（3307）的连接流。

**Schema Designer**
- S-01 Create Table: 输入表名，添加多个列，选择数据类型，验证 DDL 执行预览。
- S-02 Column Operations: 验证添加/删除列、设置主键（PK）、设置长度/精度。
- S-03 DDL Execution: 提交更改后，验证结构页签关闭且侧边栏出现新表。

**Data Grid**
- D-01 Create Row: 右键菜单 "Add Row"，输入数据，保存并验证行出现在网格中。
- D-02 Inline Update: 双击单元格打开编辑模态框/文本框，修改值并保存。
- D-03 Delete Row: 右键选择 "Delete Row"，验证 ConfirmModal 弹出并确认删除。
- D-04 Refresh: 点击刷新按钮或按下快捷键 (Cmd/Ctrl+R)，数据重新加载。

**Advanced Features**
- A-01 SQL Console: 使用快捷键 (Cmd/Ctrl+T) 打开新页签，执行批量 SQL，验证结果统计显示。
- A-02 Pagination: 验证数据超过每页限额（默认 100）时出现分页控件，点击 "Next" 翻页。
- A-03 Sorting: 点击列头切换升序/降序状态。
- A-04 Filtering: 使用 Filter Bar 添加条件（如 `price > 100`），验证行数精确匹配。

**Resilience and Errors**
- R-01 Constraint Violation: 尝试插入重复主键或非法格式（如 UUID 列填入普通字符串），验证 AlertModal 报错。
- R-02 Connection Failure: 输入错误的凭据，验证 UI 显示明确的错误提示。

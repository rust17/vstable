# vstable 架构重构计划：基于《A Philosophy of Software Design》

基于《A Philosophy of Software Design》中“降低系统复杂性”的核心理念，以下是针对 `vstable` 项目（React 前端 -> Tauri Rust 中间层 -> Go 后端）的系统性重构计划。该计划分为四个主要方向，建议在日常开发中逐步落地。

---

## 阶段一：消除“信息泄漏” (Information Leakage) —— 建立单一事实来源

目前核心问题是领域模型（如表结构 `ColumnDefinition`、变更请求 `DiffRequest`）在四个地方（Go Protobuf, Go AST, Rust DTO, TS Types）手动重复维护。

### 重构策略：单一事实来源 (Single Source of Truth)
1. **统一以 Protobuf 为基准**：
   - 将 `vstable.proto` 视作系统跨语言边界的绝对真理。
2. **自动化代码生成**：
   - **Rust 端**：引入 `tonic-build` 或 `prost` 配合 Tauri。直接使用生成的 Rust Structs 作为 Tauri 命令的参数，彻底删除 `frontend/tauri/src/utils.rs` 中为了 JSON 序列化而手工编写的 `DiffRequestDto` 等冗余 DTO 结构。
   - **前端 TS 端**：配置 `protoc-gen-ts` 或 `ts-proto` 工具链，在 `npm run build` 或专门的 script 中，直接由 proto 文件生成 TypeScript 的 Interfaces。
3. **预期收益**：修改一个表字段定义，只需更改 `vstable.proto` 并运行生成脚本，编译器会自动指出三端所有不兼容的地方，彻底消除“修改放大”导致的 Unknown Unknowns 风险。

---

## 阶段二：解决“扁平化错误” (Pull Complexity Downward) —— 结构化异常传递

当前 Tauri 直接将底层错误 `to_string()` 抛给前端，导致前端无法针对不同错误（如网络超时、密码错误、数据库拒绝）做针对性处理。

### 重构策略：标准化全链路错误处理
1. **Go 后端定义规范**：利用 gRPC 的 `status.Status` 和 `details`，定义一套标准的业务错误码体系（例如：`ErrCode_ConnectionFailed`, `ErrCode_SyntaxError`）。
2. **Tauri 层抽象 `AppError`**：
   - 在 Rust 中定义一个实现了 `serde::Serialize` 的枚举 `AppError`：
     ```rust
     #[derive(Serialize)]
     pub enum AppError {
         Connection(String),
         QuerySyntax(String),
         Internal(String),
     }
     ```
   - 替换掉现有的 `map_err(|e| e.to_string())`。解析 gRPC 返回的结构化错误，转换为上述 `AppError` 并序列化返回。
3. **前端拦截**：在前端的 `client.ts` 或 API 封装层统一拦截这些结构化错误，映射为友好的 UI 弹窗或字段级错误提示。

---

## 阶段三：治理“穿透方法” (Layering & Pass-Through) —— 重新定义中间层职责

Tauri 层目前存在大量 1:1 代理后端接口的浅层方法（Shallow Modules），徒增代码行数而无实际业务价值。

### 重构策略：根据架构诉求决定去留
*面临两种选择，需根据项目长期规划决定：*
- **方案 A（减薄 - 推荐）**：如果前端和 Go 后端最终可以通过 gRPC-Web (或 Connect-RPC) 直接通信，且不需要依赖过多的 Tauri 本地系统权限，建议前端**直接调用后端 gRPC 服务**。完全剥离 Tauri 中的代理 Command，Tauri 仅负责“启动/关闭本地 Go 进程”和“提供 Native 壳”。
- **方案 B（增厚抽象）**：如果因为安全或架构限制必须保留 Tauri 作为请求中转站，那么请**重塑 Tauri 的接口**。让它提供更高层的“面向任务”的接口（例如：提供一个 `init_workspace` 方法，它在底层自动完成 ping、建立连接、拉取基础 schema 等多步 gRPC 调用），而不是单纯的搬运工。

---

## 阶段四：消除“时间耦合” (Temporal Decomposition) —— 状态显性化

目前要求“先连接，后查询”，但这一依赖关系隐藏在状态机制中，接口上不明显。

### 重构策略：通过签名强制依赖
1. **改造 `db_connect` 签名**：当连接成功时，后端/Tauri 不仅仅是在内部标记连接成功，而是返回一个显式的凭证（例如 `SessionToken: string` 或 `ConnectionId`）。
2. **改造后续操作签名**：将所有依赖连接的接口（如 `db_query`, `sql_generate_alter` 等）的入参，强制加上 `session_token` 字段。
   ```rust
   // Rust 示例
   #[tauri::command]
   async fn db_query(session_token: String, sql: String) -> Result<...>;
   ```
3. **预期收益**：通过类型签名（Type Signature）让“未知未知”变成“已知”。如果前端没有 Token，编译器或类型检查器会直接阻拦调用，彻底消除了“我不知道调用这个方法前需要先调另一个方法”的认知困扰。

---

## 建议的执行顺序
1. 优先执行 **阶段二（结构化错误）** 和 **阶段四（状态显性化）**，这两项改动范围小，但能立刻提高开发时的 Debug 效率和系统健壮性。
2. 随后集中精力攻克 **阶段一（自动化代码生成）**，一劳永逸地解决 DTO 冗余问题。
3. 最后根据产品演进方向，决定 **阶段三** 中 Tauri 层的最终命运。
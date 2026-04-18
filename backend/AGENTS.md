# Agent Context: Go Engine (Backend)

> **ATTENTION AI AGENTS & DEVELOPERS:**  
> 此目录 `backend/` 包含了 vstable 的核心计算引擎（Go 1.24）。这里承载了数据库直连、AST Diff 计算和网络服务的重任。在编写代码前，请牢记这里的核心逻辑与架构规则。

## 1. Core Logic & Responsibilities

**AST 状态对齐与 gRPC-Web 服务**
后端作为一个独立的二进制进程（Sidecar），承担着应用中最核心的“脏活累活”。

- **gRPC-Web Server (`main.go`)**：
  - 核心逻辑：后端不使用 Envoy 代理，而是借助 `improbable-eng/grpc-web` 库将标准的 gRPC Server 包装为 `http.Server`，直接向浏览器的 Fetch API 提供服务。
- **Session Management (`internal/db`)**：
  - 引擎内部通过 `db.Manager` 在内存中维护了一个以 `id` (Session ID) 为键的线程安全字典，确保前端同一连接复用对应的 DB Driver 实例。

## 2. Business Logic Map (业务逻辑快速定位导航)

遇到需求变更或修复 Bug 时，请根据以下模块分工快速定位代码：

- **网络入口与拦截器 (`main.go`)**
  - **职责**: 端口监听 (默认 `:39082`)，gRPC-Web 协议转换。
  - **跨域**: `rs/cors` 跨域策略配置。
  - **拦截器**: `UnaryInterceptor` 用于全局请求的 `panic` 捕捉与耗时、错误日志打印。
- **数据库驱动层 (`internal/db/driver.go`)**
  - **职责**: 底层依赖 `pgx/v5` 和 `go-sql-driver/mysql`。
  - **逻辑**: 执行纯文本 SQL 并解析动态数据结构；获取数据库系统元数据 (Meta queries)。
- **抽象语法树模型 (`internal/ast/types.go`)**
  - **职责**: 跨方言的统一数据结构。
  - **逻辑**: 定义 Table, Column, Index 等实体，作为前后端状态对齐的媒介。
- **状态对齐与差异计算 (`internal/ast/diff.go`)**
  - **职责**: 比较 Old AST 和 New AST。
  - **逻辑**: 识别出需要增加、删除或修改的列与约束。
- **方言 DDL 生成器 (`internal/ast/compiler_pg.go` & `compiler_mysql.go`)**
  - **职责**: 将 diff 结果翻译为特定数据库的 SQL 语句。
  - **逻辑**: 处理诸如修改非空约束、更改数据类型等具体方言的 SQL 拼接。修改此类文件极易引发线上 Bug。
- **Protobuf 转换映射 (`internal/mapper/`)**
  - **职责**: 将 gRPC 传入的 Protobuf struct (`pb.*`) 转换为内部 AST 原生结构。

## 3. Hard Rules for AI Agents (Go Layer)

修改后端代码时，必须遵守以下防翻车铁律：

- **[RULE 1] 跨域安全红线 (CORS Gotchas)**：
  - **致命警告 (Wildcard vs. Credentials Conflict)**：当 `main.go` 中的 `AllowedOrigins` 包含 wildcard `*` 时，`AllowCredentials` **必须且只能设置为 `false`**。
  - **排障特征**：一旦错误配置，浏览器会拦截 Preflight 请求，并在前端抛出晦涩的 `/vstable.EngineService/DbConnect UNKNOWN: Transport error: Load failed` 错误。
- **[RULE 2] 标准化错误处理 (gRPC Status Codes)**：
  - 必须使用 `google.golang.org/grpc/status` 包装对外返回的 error，以便前端的 Interceptor 能够精准拦截和归类（如 `codes.NotFound`, `codes.InvalidArgument`）。
- **[RULE 3] 防御性编程与 Panic 恢复**：
  - `UnaryInterceptor` 已提供全局 `recover()`，但在编写业务逻辑时，必须显式返回 `error`，严禁滥用 `panic`。
- **[RULE 4] AST/DDL 变更的测试覆盖要求**：
  - 涉及 `internal/ast`（SQL 生成逻辑）或 `internal/db`（方言特化适配）的任何改动，**必须**补充对应的集成测试（如 `diff_integration_pg_test.go`），且必须在真实 Docker 数据库中验证执行。

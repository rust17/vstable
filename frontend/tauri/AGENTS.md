# Agent Context: Tauri Core (Thin Shell)

> **ATTENTION AI AGENTS & DEVELOPERS:**  
> 此目录 `frontend/tauri/` 包含了 vstable 应用程序的系统原生层。在修改此处的 Rust 代码时，必须深刻理解本项目对 Tauri 角色的定位限制。

## 1. Core Logic & Responsibilities

在 `vstable` 架构中，Tauri 被严格降级为 **"Thin Shell" (薄壳层)**。它的核心逻辑只包含以下几点：

- **Sidecar Lifecycle Management (边车生命周期)**：
  - 在 `src/lib.rs` 的 `setup` 钩子中，Tauri 负责启动编译好的 Go 二进制文件 (`vstable-engine`)。
  - Tauri 会监听 Sidecar 的 `stdout` 和 `stderr`，并通过 `tauri-plugin-log` 管道化输出，便于在桌面端的日志目录下（如 `~/Library/Logs/com.vstable.dev`）追溯后端的崩溃与运行记录。
- **Native OS Capabilities (操作系统原生能力)**：
  - 提供纯前端（Browser Context）无法完成的操作，例如：窗口的最大化/恢复 (`window_toggle_maximize`)、文件系统对话框、深色模式跟随系统。
- **Persistent Key-Value Store (本地状态持久化)**：
  - 使用 `tauri-plugin-store` 保存轻量级的用户偏好设置，如：已保存的数据库连接配置、打开的 Workspace 状态。

## 2. Hard Rules for AI Agents (Tauri Layer)

当你被要求修改 `frontend/tauri/` 目录下的代码时，**绝对禁止**以下操作：

- **[PROHIBITED] 禁止处理业务网络请求**：
  - **绝不允许**在 `src/commands.rs` 中使用 `reqwest`, `tonic`, 或任何 HTTP/gRPC 客户端来代理前端的请求（例如 `db_query`, `db_connect`）。
  - 原因：这会创造“浅模块”(Shallow Modules)，导致大量无效的 JSON <-> Protobuf <-> Rust Struct 的透传代码。所有数据库业务应由前端 React 直接发往 Go Engine。
- **[PROHIBITED] 禁止在 Rust 层维护业务状态**：
  - 数据库的连接池、Session 管理必须放在 Go Backend (`vstable-engine`) 中。Tauri 内部（除了插件状态外）必须保持无状态 (Stateless)。

## 3. How to add a new Native Feature

如果用户确实需要一个操作系统级别的功能（例如：打开本地文件选择器读取证书）：

1. 在 `src/commands.rs` 中新增 `#[tauri::command]`。
2. 参数传递和返回值应尽量简单，使用标准类型或 `serde_json::Value`。
3. 在 `src/lib.rs` 中的 `tauri::generate_handler!` 宏里注册该命令。
4. 如果使用了新的 Tauri API 或插件，切记在 `capabilities/default.json` (Tauri v2 权限管理系统) 中添加对应的前端 IPC 调用权限。

## 4. Troubleshooting

- **Sidecar 未启动/闪退**：
  - 检查 `tauri.conf.json` 中 `bundle.externalBin` 的配置是否与 Go 编译出的二进制后缀 (`-aarch64-apple-darwin` 等) 完全匹配。
  - 查看 Rust 控制台的 `Sidecar Error:` 日志，通常是因为本地 `:39082` 端口被占用。

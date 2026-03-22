# Tauri

此目录包含 vstable 桌面应用程序的 Rust 核心部分，基于 Tauri v2 构建。它充当 TypeScript 前端与 Go 语言编写的数据库引擎（Sidecar）之间的桥梁。

## 架构概览

- **Tauri v2:** 使用最新的 Tauri 框架进行窗口管理和系统集成。
- **Go Sidecar:** 核心数据库引擎作为一个 Go 二进制文件捆绑为 Sidecar（边车）。
- **gRPC 通信:** Rust 层通过 gRPC (Tonic) 与 Go Sidecar 进行通信。
- **命令代理:** `commands.rs` 中的大多数 Tauri 命令都是异步代理，负责将请求转发给 gRPC 服务，并在 JSON 与 Protobuf 之间进行类型转换。

## 关键文件与职责

- `src/main.rs`: 应用程序入口点。
- `src/lib.rs`: 处理插件初始化、Sidecar 启动以及全局状态管理 (`GrpcState`)。
- `src/commands.rs`: 定义暴露给前端的 gRPC 接口。
- `src/grpc.rs`: 定义共享的 gRPC 客户端状态和连接管理。
- `src/utils.rs`: 包含 `serde_json::Value` 与 `prost_types` (Protobuf) 之间的转换逻辑。
- `build.rs`: 在构建过程中编译 `backend/api/` 目录下的 gRPC `.proto`。
- `tauri.conf.json`: 应用程序(vstable)的窗口样式、打包设置和 Sidecar 定义的配置。
- `capabilities/` & `permissions/`: Tauri v2 的安全权限配置。

## 开发指南

### 添加新命令
1. 如果需要数据库交互，请确保 `vstable.proto` 中的 gRPC 服务支持该操作。
2. 在 `src/commands.rs` 中实现命令。使用 `GrpcState` 访问 gRPC 客户端。
3. 在 `src/lib.rs` 的 `generate_handler!` 宏中注册该命令。
4. 如果使用了新的插件，请确保在 `capabilities/default.json` 中添加相应的权限。

### Sidecar 管理
- Go Sidecar 在 `src/lib.rs` 的 `.setup()` 钩子中进行管理。
- Sidecar 的标准输出/错误会被管道传输到 Rust 控制台，以便调试。
- Sidecar 二进制文件名在 `tauri.conf.json` 的 `bundle > externalBin` 中定义。

### 类型安全
- 使用 `prost_types` 确保 Protobuf 兼容性。
- 使用 `serde_json` 处理与前端的通信。
- `src/utils.rs` 中的转换逻辑应尽量保持通用（例如 `json_to_prost_value`）。

## 故障排除
- **gRPC 失败:** 检查 Sidecar 是否正在运行，且端口（`39082`）在 Rust 和 Go 之间是否一致。
- **Proto 变更:** 如果 `vstable.proto` 发生变化，请运行构建以触发 `build.rs` 并更新 `vstable` 模块中生成的代码。

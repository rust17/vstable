# Electron to Tauri 迁移计划 - 已完成

## 1. 迁移动机
- **核心目标**：在 macOS 上实现局部滚动容器的原生橡皮筋回弹效果（WebKit/Safari 特性）。
- **附加收益**：
    - 安装包体积从 100MB+ 减小至 ~10MB。
    - 显著降低内存占用。
    - 更好的 macOS 原生集成（如毛玻璃效果、系统级 API）。

## 2. 架构调整
- **旧架构**：Electron (Main/Preload) + React + Go (Sidecar)
- **新架构**：Tauri (Rust) + React + Go (Sidecar)
- **关键点**：将 Node.js 主进程逻辑迁移至 Rust，前端通过 Tauri IPC 与 Rust 通信，Rust 管理 Go 后端生命周期。

## 3. 详细执行计划

### Phase 1: 环境初始化 (✅)
- [x] 安装 `@tauri-apps/api` 和 `@tauri-apps/cli`。
- [x] 运行 `npx tauri init` 初始化 Rust 核心。
- [x] 配置 `tauri.conf.json`，设置窗口样式、权限及前端构建路径。

### Phase 2: Go 后端 (Sidecar) 迁移 (✅)
- [x] 在 `tauri.conf.json` 中配置 `bundle > externalBin` 引入 Go 二进制。
- [x] 在 Rust `lib.rs` 中编写 Sidecar 启动逻辑。
- [x] 在 Rust 侧实现 gRPC 客户端转发逻辑。

### Phase 4: 前端 IPC 适配 (✅)
- [x] 全局搜索并替换 `window.electron` 为 Tauri 的 `invoke`。
- [x] 迁移窗口控制逻辑（最大化/还原/关闭）。
- [x] 适配 `tauri-plugin-store` 替代现有的持久化存储。

### Phase 5: 清理与优化 (✅)
- [x] 移除 `frontend/src/main` 和 `frontend/src/preload` 目录。
- [x] 移除 `electron` 相关依赖及构建脚本。
- [x] 创建并配置 `vite.config.ts`。
- [x] **样式回归**：WebKit (Safari) 内核已自动激活局部容器的原生回弹效果。

---
**当前进度**：已完成。应用已切换至 Tauri 架构。

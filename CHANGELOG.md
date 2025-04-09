# 更新日志 (Changelog)

## 版本 1.1.3 (当前版本)
- 修复了 Events 导入路径问题，从 SDK 主模块分离导入 Events
- 更新了导入路径，从 `server/mcp.js` 更改为 `dist/esm/server.js` 和 `dist/esm/events.js`

## 版本 1.1.2
- 修复了 MCP SDK 导入路径重复问题，从 `dist/esm/server/index.js` 更改为 `dist/esm/server.js`
- 修复了 NoStr 库中 `relay.publish()` 方法的兼容性问题
- 更新了发布机制，从事件监听器模式更改为异步/await 模式
- 增强了错误处理机制，加入了更多 try/catch 块

## 版本 1.1.1
- 修复了 MCP SDK 导入路径问题，从 `/server` 更改为 `/dist/esm/server/index.js`
- 增加了对 ES 模块的更好支持，添加了 `--es-module-specifier-resolution=node` 标志
- 添加了 `concurrently` 依赖项，无需 tmux 即可启动所有服务
- 新增 `start:all:concurrent` 命令以便使用 concurrently 启动所有服务

## 版本 1.1.0
- 更新使用 ES 模块语法
- 升级到最新的 Model Context Protocol SDK v1.9.0（注意：之前版本使用的是 0.1.0）
- 更新了 SDK 导入路径和 API 使用方式（从 MCPServerEvents 更新到 Events）
- 按照规范实现了完整的 MCP 协议
- 增强了错误处理和连接管理
- 改进了 WebSocket 兼容性
- 修复了模块导入/导出问题
- 添加了详细的文档说明

## 版本 1.0.0 (初始版本)
- 基本实现了 NoStr MCP 通信流
- 完成客户端、代理和服务器组件
- 简单的 MCP 服务器实现
- NoStr 中继通信功能

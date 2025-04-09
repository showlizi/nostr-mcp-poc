# NoStr MCP Proof of Concept

## English

### Project Overview
This project demonstrates a communication flow between a client and an MCP (Model Context Protocol) server through NoStr, implementing the following architecture:

```
Client <-- SSE --> Proxy <-- STDIO over NoStr --> Proxy <-- STDIO --> MCP Server
```

The system enables secure, real-time communication between clients and MCP servers across networks, leveraging the decentralized NoStr protocol as a transport layer.

### Architecture Components

1. **Client**: 
   - Web-based user interface
   - Communicates with the client-side proxy using Server-Sent Events (SSE)
   - Provides a simple chat interface for sending messages and viewing responses

2. **Client-side Proxy**:
   - Express.js server running on port 3001
   - Handles SSE connections with multiple clients
   - Communicates with the server-side proxy over the NoStr protocol
   - Publishes client messages to NoStr relay with appropriate tags
   - Subscribes to responses from the server-side proxy

3. **Server-side Proxy**:
   - Connects to the same NoStr relay as the client-side proxy
   - Subscribes to messages tagged for MCP requests
   - Communicates with the MCP server using STDIO (Standard Input/Output)
   - Forwards responses from the MCP server back to the NoStr network

4. **MCP Server**:
   - Implements a simple Model Context Protocol server
   - Receives requests via STDIO
   - Processes requests and sends responses back through STDIO
   - Can be replaced with any MCP-compliant server implementation

### NoStr Protocol Integration
The system uses NoStr (Notes and Other Stuff Transmitted by Relays) as the transport layer between proxies:
- Uses public/private key cryptography for message signing
- Connects to public NoStr relays (default: wss://relay.damus.io)
- Tags messages for request/response routing
- Provides a decentralized, resilient communication channel

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nostr-mcp-poc.git
cd nostr-mcp-poc

# Install dependencies
npm install
```

### Dependencies
- **Express**: Web server framework for the client and proxy servers
- **NoStr Tools**: Library for NoStr protocol communication
- **WS/WebSocket-polyfill**: For NoStr relay connections
- **@modelcontextprotocol/sdk**: For the MCP server implementation (v1.9.0+)
- **CORS**: For handling cross-origin requests
- **Body-parser**: For parsing JSON request bodies

### Configuration

The project comes with default configurations, but you may want to customize:

1. **NoStr Relay URL**:
   - Both proxy-client.js and proxy-server.js use wss://relay.damus.io by default
   - Change `relayUrl` in both files if you want to use a different relay

2. **Private Keys**:
   - The system generates new keypairs on each startup
   - For stable identity, replace `generatePrivateKey()` with fixed keys
   - Ensure client and server proxies use different keypairs

3. **Ports**:
   - Client web server: Port 3000
   - Client-side proxy: Port 3001
   - Modify these in their respective files if needed

### Running the Project

You need to start all four components. You can do this in several ways:

#### Option 1: Using concurrently (recommended, no additional tools required)

```bash
# First install the dependencies including concurrently
npm install

# Run all components at once
npm run start:all:concurrent
```

This will start all four components in the same terminal window with color-coded output.

#### Option 2: Using the tmux script (requires tmux)

```bash
# Make the script executable
chmod +x start-all.sh

# Run all components in tmux panes
npm run start:all
```

To exit tmux session: Press `Ctrl+B`, then type `:kill-session` and press Enter

#### Option 2: Start each component individually in separate terminals

```bash
# Terminal 1 - Start the MCP Server
npm run start:server

# Terminal 2 - Start the Server-side Proxy
npm run start:proxy2

# Terminal 3 - Start the Client-side Proxy
npm run start:proxy1

# Terminal 4 - Start the Client Web Server
npm run start:client
```

### Using the Application

1. Open your browser to http://localhost:3000
2. You'll see a simple chat interface
3. Type a message in the input field and click "Send"
4. The message will travel through the entire system:
   - Client → Client Proxy → NoStr Network → Server Proxy → MCP Server
   - The response follows the reverse path
5. Response messages will appear in the chat window

### Data Flow Breakdown

1. **Client to Client Proxy**:
   - User enters a message in the web interface
   - Client sends a POST request to `/message` endpoint
   - Client maintains an SSE connection to the `/events` endpoint

2. **Client Proxy to NoStr**:
   - Client proxy creates a NoStr event with kind 1 (text note)
   - Event is tagged with "mcp-request" for identification
   - Event is signed with the client proxy's private key
   - Event is published to the NoStr relay

3. **NoStr to Server Proxy**:
   - Server proxy subscribes to events tagged with "mcp-request"
   - When a matching event is received, the content is extracted
   - Message is forwarded to the MCP server via STDIO

4. **Server Proxy to MCP Server**:
   - Message is formatted as JSON and written to MCP server's stdin
   - MCP server processes the request and generates a response
   - Response is sent back through stdout

5. **MCP Server to Server Proxy**:
   - Server proxy reads the response from the MCP server's stdout
   - Response is parsed from JSON

6. **Server Proxy to NoStr**:
   - Server proxy creates a NoStr event with kind 1
   - Event is tagged with "mcp-response" for identification
   - Event is signed with the server proxy's private key
   - Event is published to the NoStr relay

7. **NoStr to Client Proxy**:
   - Client proxy subscribes to events tagged with "mcp-response"
   - When a matching event is received, the content is extracted

8. **Client Proxy to Client**:
   - Response is sent to all connected clients via SSE
   - Client displays the response in the chat interface

### Error Handling

The system implements several error handling mechanisms:

1. **Client-side reconnection**:
   - If the SSE connection fails, the client automatically attempts to reconnect
   - Reconnection attempts occur every 3 seconds

2. **NoStr connection retry**:
   - Both proxies attempt to reconnect to the NoStr relay if the connection fails
   - Reconnection attempts occur every 5 seconds

3. **MCP server restart**:
   - If the MCP server process crashes, the server proxy will restart it
   - Restart attempts occur every 5 seconds

4. **Message parsing errors**:
   - All JSON parsing is wrapped in try/catch blocks
   - Errors are logged to the console and appropriate error responses are sent

### Security Considerations

This is a proof of concept and has several security limitations:

1. **No Authentication**:
   - The system does not authenticate clients or validate message sources
   - In production, implement user authentication and authorization

2. **Unencrypted Messages**:
   - While NoStr itself uses cryptographic signing, message content is not encrypted
   - For sensitive data, implement end-to-end encryption of the message payload

3. **No Rate Limiting**:
   - The system has no protection against flooding or DoS attacks
   - Implement rate limiting for production use

4. **Limited Input Validation**:
   - Minimal input validation is performed
   - Implement comprehensive validation for production

5. **Public Relay Usage**:
   - Using public NoStr relays means anyone can see the messages
   - For private communications, use a private relay

### Advanced Configuration

#### Using Private NoStr Relays

For greater privacy and security, you can run your own NoStr relay:

1. Set up a private NoStr relay server
2. Update the `relayUrl` in both proxy-client.js and proxy-server.js
3. Configure access permissions on your relay as needed

#### Persistent Identities

To maintain consistent identities across restarts:

1. Generate a private key pair for each proxy
2. Replace the `generatePrivateKey()` calls with your fixed private keys
3. Store these securely in environment variables or a secure vault

#### Load Balancing

For high-traffic scenarios:

1. Deploy multiple client-side proxies behind a load balancer
2. Use the same NoStr relay for all instances
3. Scale the server-side proxies and MCP servers as needed

### Extending the Project

#### Adding Authentication

1. Implement user authentication in the client application
2. Include user credentials or tokens in messages
3. Verify these in the server-side proxy before processing

#### Message Encryption

1. Implement end-to-end encryption using libsodium or similar
2. Encrypt message content before publishing to NoStr
3. Decrypt messages only at the final destination

#### Supporting Multiple MCP Servers

1. Modify the server-side proxy to route to different MCP servers
2. Add routing information to message tags
3. Instantiate the appropriate MCP server based on routing info

#### Message Queue Integration

For improved reliability:

1. Add a message queue system between the server proxy and MCP server
2. Implement persistence for unprocessed messages
3. Add retry logic for failed message delivery

### Changelog

For version history and updates, see the separate [CHANGELOG.md](./CHANGELOG.md) file.

---

## 中文

### 项目概述
本项目展示了通过 NoStr 协议在客户端和 MCP（Model Context Protocol）服务器之间建立通信流的完整实现，架构如下：

```
客户端 <-- SSE --> 代理 <-- STDIO over NoStr --> 代理 <-- STDIO --> MCP 服务器
```

该系统利用去中心化的 NoStr 协议作为传输层，实现了跨网络的安全实时通信。

### 架构组件

1. **客户端**：
   - 基于网页的用户界面
   - 使用服务器发送事件（SSE）与客户端代理通信
   - 提供简单的聊天界面，用于发送消息和查看响应

2. **客户端代理**：
   - 运行在 3001 端口的 Express.js 服务器
   - 处理与多个客户端的 SSE 连接
   - 通过 NoStr 协议与服务器端代理通信
   - 将客户端消息发布到 NoStr 中继，并附加适当的标签
   - 订阅来自服务器端代理的响应

3. **服务器端代理**：
   - 连接到与客户端代理相同的 NoStr 中继
   - 订阅标记为 MCP 请求的消息
   - 使用标准输入/输出（STDIO）与 MCP 服务器通信
   - 将 MCP 服务器的响应传回 NoStr 网络

4. **MCP 服务器**：
   - 实现简单的 Model Context Protocol 服务器
   - 通过 STDIO 接收请求
   - 处理请求并通过 STDIO 发送响应
   - 可以替换为任何兼容 MCP 的服务器实现

### NoStr 协议集成
系统使用 NoStr（Notes and Other Stuff Transmitted by Relays，通过中继传输的笔记和其他内容）作为代理之间的传输层：
- 使用公钥/私钥加密技术签名消息
- 连接到公共 NoStr 中继（默认：wss://relay.damus.io）
- 为请求/响应路由标记消息
- 提供去中心化、弹性的通信通道

### 安装

```bash
# 克隆仓库
git clone https://github.com/yourusername/nostr-mcp-poc.git
cd nostr-mcp-poc

# 安装依赖
npm install
```

### 依赖项
- **Express**: 客户端和代理服务器的 Web 服务器框架
- **NoStr Tools**: NoStr 协议通信库
- **WS/WebSocket-polyfill**: 用于 NoStr 中继连接
- **@modelcontextprotocol/sdk**: MCP 服务器实现（v1.9.0+）
- **CORS**: 处理跨源请求
- **Body-parser**: 解析 JSON 请求体

### 配置

项目自带默认配置，但您可能需要自定义：

1. **NoStr 中继 URL**：
   - proxy-client.js 和 proxy-server.js 默认使用 wss://relay.damus.io
   - 如果想使用不同的中继，请在两个文件中更改 `relayUrl`

2. **私钥**：
   - 系统在每次启动时生成新的密钥对
   - 为了保持稳定的身份，请将 `generatePrivateKey()` 替换为固定密钥
   - 确保客户端和服务器代理使用不同的密钥对

3. **端口**：
   - 客户端 Web 服务器：端口 3000
   - 客户端代理：端口 3001
   - 如有需要，可在各自的文件中修改这些设置

### 运行项目

您需要启动所有四个组件。有几种方法可以实现：

#### 方法一：使用 concurrently（推荐，无需其他工具）

```bash
# 首先安装依赖项，包括 concurrently
npm install

# 同时运行所有组件
npm run start:all:concurrent
```

这将在同一终端窗口中启动所有四个组件，并使用彩色输出区分不同组件的日志。

#### 方法二：使用 tmux 脚本（需要安装 tmux）

```bash
# 使脚本可执行
chmod +x start-all.sh

# 在 tmux 窗格中运行所有组件
npm run start:all
```

退出 tmux 会话：按下 `Ctrl+B`，然后输入 `:kill-session` 并按回车

#### 方法二：在单独的终端中分别启动每个组件

```bash
# 终端 1 - 启动 MCP 服务器
npm run start:server

# 终端 2 - 启动服务器端代理
npm run start:proxy2

# 终端 3 - 启动客户端代理
npm run start:proxy1

# 终端 4 - 启动客户端 Web 服务器
npm run start:client
```

### 使用应用程序

1. 打开浏览器访问 http://localhost:3000
2. 您将看到一个简单的聊天界面
3. 在输入框中输入消息并点击"发送"
4. 消息将通过整个系统传输：
   - 客户端 → 客户端代理 → NoStr 网络 → 服务器代理 → MCP 服务器
   - 响应按照相反的路径返回
5. 响应消息将显示在聊天窗口中

### 数据流详解

1. **客户端到客户端代理**：
   - 用户在网页界面输入消息
   - 客户端向 `/message` 端点发送 POST 请求
   - 客户端维持与 `/events` 端点的 SSE 连接

2. **客户端代理到 NoStr**：
   - 客户端代理创建类型为 1（文本笔记）的 NoStr 事件
   - 事件标记为 "mcp-request" 以便识别
   - 事件使用客户端代理的私钥签名
   - 事件发布到 NoStr 中继

3. **NoStr 到服务器代理**：
   - 服务器代理订阅标记为 "mcp-request" 的事件
   - 当收到匹配的事件时，提取内容
   - 通过 STDIO 将消息转发到 MCP 服务器

4. **服务器代理到 MCP 服务器**：
   - 消息格式化为 JSON 并写入 MCP 服务器的标准输入
   - MCP 服务器处理请求并生成响应
   - 响应通过标准输出发送回来

5. **MCP 服务器到服务器代理**：
   - 服务器代理从 MCP 服务器的标准输出读取响应
   - 从 JSON 解析响应

6. **服务器代理到 NoStr**：
   - 服务器代理创建类型为 1 的 NoStr 事件
   - 事件标记为 "mcp-response" 以便识别
   - 事件使用服务器代理的私钥签名
   - 事件发布到 NoStr 中继

7. **NoStr 到客户端代理**：
   - 客户端代理订阅标记为 "mcp-response" 的事件
   - 当收到匹配的事件时，提取内容

8. **客户端代理到客户端**：
   - 通过 SSE 将响应发送到所有连接的客户端
   - 客户端在聊天界面显示响应

### 错误处理

系统实现了多种错误处理机制：

1. **客户端重连**：
   - 如果 SSE 连接失败，客户端会自动尝试重新连接
   - 每 3 秒重新连接一次

2. **NoStr 连接重试**：
   - 如果连接到 NoStr 中继失败，两个代理都会尝试重新连接
   - 每 5 秒重新连接一次

3. **MCP 服务器重启**：
   - 如果 MCP 服务器进程崩溃，服务器代理会重新启动它
   - 每 5 秒尝试重新启动一次

4. **消息解析错误**：
   - 所有 JSON 解析都包含在 try/catch 块中
   - 错误记录到控制台，并发送适当的错误响应

### 安全考虑

这是一个概念验证，存在几个安全限制：

1. **无身份验证**：
   - 系统不验证客户端或验证消息来源
   - 在生产环境中，应实现用户身份验证和授权

2. **未加密消息**：
   - 虽然 NoStr 本身使用加密签名，但消息内容未加密
   - 对于敏感数据，应实现消息负载的端到端加密

3. **无速率限制**：
   - 系统没有防洪水或 DoS 攻击的保护
   - 生产使用时应实现速率限制

4. **有限的输入验证**：
   - 只执行最小的输入验证
   - 对于生产环境，应实现全面的验证

5. **使用公共中继**：
   - 使用公共 NoStr 中继意味着任何人都可以看到消息
   - 对于私人通信，应使用私有中继

### 高级配置

#### 使用私有 NoStr 中继

为了提高隐私和安全性，您可以运行自己的 NoStr 中继：

1. 设置私有 NoStr 中继服务器
2. 在 proxy-client.js 和 proxy-server.js 中更新 `relayUrl`
3. 根据需要配置中继的访问权限

#### 持久身份

为了在重启之间保持一致的身份：

1. 为每个代理生成私钥对
2. 用固定的私钥替换 `generatePrivateKey()` 调用
3. 将这些密钥安全地存储在环境变量或安全保险库中

#### 负载均衡

对于高流量场景：

1. 在负载均衡器后部署多个客户端代理
2. 为所有实例使用相同的 NoStr 中继
3. 根据需要扩展服务器端代理和 MCP 服务器

### 扩展项目

#### 添加身份验证

1. 在客户端应用程序中实现用户身份验证
2. 在消息中包含用户凭证或令牌
3. 在处理前在服务器端代理中验证这些凭证

#### 消息加密

1. 使用 libsodium 或类似库实现端到端加密
2. 在发布到 NoStr 之前加密消息内容
3. 只在最终目的地解密消息

#### 支持多个 MCP 服务器

1. 修改服务器端代理以路由到不同的 MCP 服务器
2. 在消息标签中添加路由信息
3. 根据路由信息实例化适当的 MCP 服务器

#### 消息队列集成

为了提高可靠性：

1. 在服务器代理和 MCP 服务器之间添加消息队列系统
2. 实现未处理消息的持久性
3. 为失败的消息传递添加重试逻辑

### 更新日志

有关版本历史和更新，请参阅单独的 [CHANGELOG.md](./CHANGELOG.md) 文件。

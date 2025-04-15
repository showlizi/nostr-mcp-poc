// // Import the MCP Server SDK (这里不要修改我的代码)
// import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
// import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
// import dotenv from 'dotenv';
// import winston from 'winston';
// import { createLogger } from '../utils.js';
// import http from 'http'; // 用于 SSE 传输层

// // 加载环境变量
// dotenv.config();

// // 创建组件专用日志记录器
// const logger = createLogger('MCP-SERVER');

// // 配置 Winston 日志记录器以获得更详细的日志
// const winstonLogger = winston.createLogger({
//   level: process.env.LOG_LEVEL || 'info',
//   format: winston.format.combine(
//     winston.format.timestamp(),
//     winston.format.json()
//   ),
//   transports: [
//     new winston.transports.Console({
//       format: winston.format.simple()
//     })
//   ]
// });

// // 定义服务器配置
// const serverConfig = {
//   name: process.env.SERVER_NAME || "NoStr MCP Demo Server",
//   version: process.env.SERVER_VERSION || "1.0.0",
//   models: [
//     {
//       id: process.env.MODEL_ID || "demo-model",
//       name: process.env.MODEL_NAME || "Demo Model",
//       capabilities: {
//         completion: true,
//         chat: true,
//         embeddings: false
//       },
//       description: process.env.MODEL_DESCRIPTION || "A demonstration model for the NoStr MCP POC"
//     }
//   ],
//   requestHandler: handleResourceRequest,
//   errorHandler: (error) => {
//     logger.error('MCP Server Error:', error);
//   }
// };

// // 创建 HTTP 服务器用于 SSE 传输
// const httpServer = http.createServer();

// // 配置 SSE 传输层
// const sseTransport = new SSEServerTransport({
//   server: httpServer,
//   path: '/mcp' // MCP 请求的端点
// });

// // 创建 MCP 服务器实例并绑定传输层
// const server = new McpServer({
//   ...serverConfig,
//   transport: sseTransport
// });

// // 定义资源请求处理函数
// function handleResourceRequest(req) {
//   logger.info(`Processing resource request: ${req.method}`);
  
//   try {
//     // 验证请求
//     if (!req.params || !req.params.template) {
//       throw new Error('Invalid request: missing params or template');
//     }

//     // 处理聊天请求
//     if (req.params.template === "chat") {
//       const { messages } = req.params.body || {};
//       if (!messages || !Array.isArray(messages)) {
//         throw new Error('Invalid chat request: missing or invalid messages');
//       }
//       logger.info(`Chat request with ${messages.length} messages`);
      
//       // 获取最后一条用户消息
//       const lastUserMessage = messages.filter(m => m.role === "user").pop();
//       if (!lastUserMessage) {
//         throw new Error('No user message found in request');
//       }
      
//       // 处理消息并生成响应
//       const messageContent = lastUserMessage.content || "No message content";
//       const responseText = processMessage(messageContent);
      
//       // 返回 MCP 格式的响应
//       return {
//         jsonrpc: "2.0",
//         id: req.id,
//         result: {
//           type: "chat.completion",
//           model: "demo-model",
//           output: {
//             message: {
//               role: "assistant",
//               content: responseText
//             }
//           },
//           usage: {
//             prompt_tokens: calculateTokens(messageContent),
//             completion_tokens: calculateTokens(responseText),
//             total_tokens: calculateTokens(messageContent) + calculateTokens(responseText)
//           }
//         },
//         params: {
//           metadata: req.params.metadata || {}
//         }
//       };
//     }
    
//     // 处理其他请求类型
//     throw new Error(`Unsupported request template: ${req.params.template}`);
    
//   } catch (error) {
//     logger.error('Error processing request:', error);
    
//     // 返回 MCP 格式的错误
//     return {
//       jsonrpc: "2.0",
//       id: req.id,
//       error: {
//         code: -32603,
//         message: `Internal error: ${error.message}`
//       },
//       params: {
//         metadata: req.params.metadata || {}
//       }
//     };
//   }
// }

// /**
//  * 简单的消息处理函数
//  * @param {string} message 输入消息
//  * @returns {string} 处理后的响应
//  */
// function processMessage(message) {
//   // 基本消息处理逻辑
//   if (!message || typeof message !== 'string') {
//     return 'Error: Invalid message input';
//   }

//   if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
//     return 'Hello! How can I assist you today?';
//   }
  
//   if (message.toLowerCase().includes('help')) {
//     return 'I can assist with various tasks. Just let me know what you need help with!';
//   }
  
//   if (message.toLowerCase().includes('nostr') || message.toLowerCase().includes('dephy')) {
//     return 'NoStr (Notes and Other Stuff Transmitted by Relays) is a protocol for distributed social media. ' +
//            'DePHY is a messaging layer built on NoStr for device and software communication.';
//   }
  
//   // 默认响应
//   return `I've processed your message: "${message}". How can I help further?`;
// }

// /**
//  * 简单的令牌计数函数（仅为近似值）
//  * @param {string} text 输入文本 
//  * @returns {number} 近似令牌数
//  */
// function calculateTokens(text) {
//   if (!text) return 0;
//   // 简单近似 - 每4个字符约为1个令牌
//   return Math.ceil(text.length / 4);
// }

// // 启动服务器
// async function startServer() {
//   try {
//     logger.info('Starting MCP Server...');
    
//     // 启动 HTTP 服务器和 SSE 传输层
//     const port = process.env.PORT || 8010;
//     httpServer.listen(port, () => {
//       logger.info(`MCP Server is running on port ${port}`);
//     });
    
//     // 无需调用 server.start()，传输层已通过 httpServer 启动
//     logger.info('MCP Server initialized with SSE transport');
    
//   } catch (error) {
//     logger.error('Failed to start MCP Server:', error);
//     process.exit(1);
//   }
// }

// // 日志记录服务器启动
// logger.info('MCP Server initialized and waiting for input...');
// // startServer();

// // 添加关闭处理程序
// process.on('SIGINT', async () => {
//   logger.info('Shutting down MCP Server...');
//   try {
//     // 关闭 HTTP 服务器
//     httpServer.close(() => {
//       logger.info('HTTP server stopped');
//     });
//     // 无需调用 server.stop()，因为它可能不存在
//     logger.info('MCP Server stopped');
//   } catch (error) {
//     logger.error('Error during shutdown:', error);
//   }
//   process.exit(0);
// });

// process.on('uncaughtException', (error) => {
//   logger.error('Uncaught exception:', error);
//   process.exit(1);
// });
// 更新导入以使用正确的路径并包含 Events
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
// import { WebSocketTransport } from "@modelcontextprotocol/sdk/server/transport/ws.js";
import dotenv from 'dotenv';
import winston from 'winston';
import { createLogger } from '../utils.js';
import http from 'http';

// 加载环境变量
dotenv.config();

// 创建组件的自定义日志记录器
const logger = createLogger('MCP-SERVER');

// 配置Winston日志记录器以获取更详细的日志信息
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// 定义服务器配置
const serverConfig = {
  name: process.env.SERVER_NAME || "NoStr MCP Demo Server",
  version: process.env.SERVER_VERSION || "1.0.0",
  models: [
    {
      id: process.env.MODEL_ID || "demo-model",
      name: process.env.MODEL_NAME || "Demo Model",
      capabilities: {
        completion: true,
        chat: true,
        embeddings: false
      },
      description: process.env.MODEL_DESCRIPTION || "A demonstration model for the NoStr MCP POC"
    }
  ],
  requestHandler: handleResourceRequest,
  errorHandler: (error) => {
    logger.error('MCP Server Error:', error);
    // 重要：不在这里调用 process.exit()
  }
};

// 设置处理器函数
function handleResourceRequest(req) {
  logger.info(`Processing resource request: ${req.method}`);
  
  try {
    // 处理聊天请求
    if (req.params.template === "chat") {
      const { messages } = req.params.body;
      logger.info(`Chat request with ${messages.length} messages`);
      
      // 获取最后一条用户消息
      const lastUserMessage = messages.filter(m => m.role === "user").pop();
      
      // 处理消息并生成响应
      const messageContent = lastUserMessage?.content || "No message found";
      const responseText = processMessage(messageContent);
      
      // 返回MCP格式的响应
      return {
        jsonrpc: "2.0",
        id: req.id,
        result: {
          type: "chat.completion",
          model: "demo-model",
          output: {
            message: {
              role: "assistant",
              content: responseText
            }
          },
          usage: {
            prompt_tokens: calculateTokens(messageContent),
            completion_tokens: calculateTokens(responseText),
            total_tokens: calculateTokens(messageContent) + calculateTokens(responseText)
          }
        },
        // 传递元数据用于响应路由
        params: {
          metadata: req.params.metadata
        }
      };
    }
    
    // 处理其他请求类型
    throw new Error(`Unsupported request template: ${req.params.template}`);
    
  } catch (error) {
    logger.error('Error processing request:', error);
    
    // 以MCP格式返回错误
    return {
      jsonrpc: "2.0",
      id: req.id,
      error: {
        code: -32603,
        message: `Internal error: ${error.message}`
      },
      // 传递元数据用于响应路由
      params: {
        metadata: req.params.metadata
      }
    };
  }
}

/**
 * 简单的消息处理函数
 * @param {string} message 输入消息
 * @returns {string} 处理后的响应
 */
function processMessage(message) {
  // 基本消息处理逻辑
  if (message.toLowerCase().includes('hello') || message.toLowerCase().includes('hi')) {
    return 'Hello! How can I assist you today?';
  }
  
  if (message.toLowerCase().includes('help')) {
    return 'I can assist with various tasks. Just let me know what you need help with!';
  }
  
  if (message.toLowerCase().includes('nostr') || message.toLowerCase().includes('dephy')) {
    return 'NoStr (Notes and Other Stuff Transmitted by Relays) is a protocol for distributed social media. ' +
           'DePHY is a messaging layer built on NoStr for device and software communication.';
  }
  
  // 默认响应
  return `I've processed your message: "${message}". How can I help further?`;
}

/**
 * 简单的token计数函数（只是一个近似值）
 * @param {string} text 输入文本
 * @returns {number} 近似token数量
 */
function calculateTokens(text) {
  // 简单近似 - 大约每4个字符一个token
  return Math.ceil(text.length / 4);
}

const httpServer = http.createServer();
// 配置 SSE 传输层
const sseTransport = new SSEServerTransport({
  server: httpServer,
  path: '/mcp' // MCP 请求的端点
});

// 创建 MCP 服务器实例并绑定传输层
const server = new McpServer({
  ...serverConfig,
  transport: sseTransport
});

// 日志记录服务器启动
logger.info('MCP Server initialized and waiting for input...');

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  // 重要：不在这里调用 process.exit()
});

// 增加这个部分来防止提前退出
process.stdin.resume();
logger.info('Standard input handling enabled');

// 手动设置SIGINT处理程序，但不立即退出
process.on('SIGINT', () => {
  logger.info('Shutting down MCP Server...');
  // 让进程自然结束，不调用 process.exit(0)
});
// Import the MCP Server SDK (这里不要修改我的代码)
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import dotenv from 'dotenv';
import winston from 'winston';
import { createLogger } from '../utils.js';

// Load environment variables
dotenv.config();

// Create a custom logger for this component
const logger = createLogger('MCP-SERVER');

// Configure Winston logger for more detailed logging
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

// Define server configuration
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
  }
};

// Create MCP server instance
const server = new McpServer(serverConfig);

// Define resource handler function
function handleResourceRequest(req) {
  logger.info(`Processing resource request: ${req.method}`);
  
  try {
    // For chat requests
    if (req.params.template === "chat") {
      const { messages } = req.params.body;
      logger.info(`Chat request with ${messages.length} messages`);
      
      // Get the last user message
      const lastUserMessage = messages.filter(m => m.role === "user").pop();
      
      // Process the message and generate a response
      const messageContent = lastUserMessage?.content || "No message found";
      const responseText = processMessage(messageContent);
      
      // Return MCP formatted response
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
        // Pass through metadata for response routing
        params: {
          metadata: req.params.metadata
        }
      };
    }
    
    // Handle other request types
    throw new Error(`Unsupported request template: ${req.params.template}`);
    
  } catch (error) {
    logger.error('Error processing request:', error);
    
    // Return error in the MCP format
    return {
      jsonrpc: "2.0",
      id: req.id,
      error: {
        code: -32603,
        message: `Internal error: ${error.message}`
      },
      // Pass through metadata for response routing
      params: {
        metadata: req.params.metadata
      }
    };
  }
}

/**
 * Simple message processing function
 * @param {string} message Input message
 * @returns {string} Processed response
 */
function processMessage(message) {
  // Basic message processing logic
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
  
  // Default response
  return `I've processed your message: "${message}". How can I help further?`;
}

/**
 * Simple token counting function (just an approximation)
 * @param {string} text Input text 
 * @returns {number} Approximate token count
 */
function calculateTokens(text) {
  // Simple approximation - about 4 characters per token
  return Math.ceil(text.length / 4);
}

// Log server start
logger.info('MCP Server initialized and waiting for input...');

// Add shutdown handler
process.on('SIGINT', () => {
  logger.info('Shutting down MCP Server...');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});
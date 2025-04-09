// Import the MCP Server SDK (这里不要修改我的代码)
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

// Import additional needed modules
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import winston from 'winston';

// Load environment variables
dotenv.config();

// Setup logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
      stderrLevels: ['info', 'warn', 'error'] // Write all logs to stderr
    }),
  ],
});

// Define our server configuration
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
  ]
};

// Create an instance of the MCP Server
const server = new McpServer(serverConfig);

// Define our event handlers as custom functions that we'll connect based on the server's API
function handleResourceRequest(resource) {
  if (resource.type === "chat") {
    try {
      const { messages } = resource.body;
      logger.info(`Processing chat request with ${messages.length} messages`);
      
      // Get the last message from the user
      const lastUserMessage = messages.filter(m => m.role === "user").pop();
      
      // Simple echo response with some processing indication
      return {
        model: "demo-model",
        message: {
          role: "assistant",
          content: `MCP Server processed: "${lastUserMessage?.content || "No message found"}"`
        },
        usage: {
          prompt_tokens: messages.reduce((acc, m) => acc + (m.content?.length || 0), 0),
          completion_tokens: 50,
          total_tokens: messages.reduce((acc, m) => acc + (m.content?.length || 0), 0) + 50
        }
      };
    } catch (error) {
      logger.error("Error processing chat request:", error);
      throw new Error("Failed to process chat request");
    }
  }
  
  throw new Error(`Unsupported resource type: ${resource.type}`);
}

// Define error handling function
function handleError(error) {
  logger.error("MCP Server error:", error);
}

// Connect the handlers to the server using the appropriate method based on SDK inspection
if (typeof server.handle === 'function') {
  // If server has a generic handle method
  server.handle('resource', handleResourceRequest);
  server.handle('error', handleError);
} else if (typeof server.handleResource === 'function') {
  // If server has specific handler methods
  server.handleResource(handleResourceRequest);
  server.handleError(handleError);
} else if (typeof server.processRequest === 'function') {
  // Another common pattern in APIs
  server.processRequest = handleResourceRequest;
  server.processError = handleError;
} else {
  // Last resort: try to add the handlers directly as properties
  server.resourceHandler = handleResourceRequest;
  server.errorHandler = handleError;
}

// Add custom method to process STDIO if not provided by the SDK
if (typeof server.initStdio !== 'function') {
  // Create our own STDIO handling
  const processStdioInput = () => {
    // Set up stdin to receive JSON input
    process.stdin.setEncoding('utf8');
    
    let inputBuffer = '';
    
    process.stdin.on('data', (chunk) => {
      inputBuffer += chunk;
      
      try {
        // Try to parse the buffer as JSON
        const request = JSON.parse(inputBuffer);
        inputBuffer = ''; // Clear the buffer after successful parsing
        
        // Process the request
        const response = handleResourceRequest(request);
        
        // Send the response back to stdout
        process.stdout.write(JSON.stringify(response) + '\n');
      } catch (error) {
        // If we can't parse it as JSON yet, it might be incomplete data
        if (!(error instanceof SyntaxError)) {
          // If it's another kind of error, log it and send an error response
          logger.error("Error processing request:", error);
          process.stdout.write(JSON.stringify({ error: error.message }) + '\n');
          inputBuffer = ''; // Clear the buffer after error
        }
      }
    });
    
    process.stdin.on('end', () => {
      logger.info("STDIO stream ended.");
      process.exit(0);
    });
    
    logger.info("MCP Server started with custom STDIO handling and waiting for input...");
  };
  
  // Start processing STDIO
  processStdioInput();
} else {
  // Use the SDK's STDIO initialization
  server.initStdio();
  logger.info("MCP Server started with SDK STDIO handling and waiting for input...");
}

// Add shutdown handler
process.on('SIGINT', () => {
  logger.info("Shutting down MCP Server...");
  if (typeof server.close === 'function') {
    server.close();
  }
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error("Uncaught exception:", error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error("Unhandled rejection at:", promise, "reason:", reason);
});
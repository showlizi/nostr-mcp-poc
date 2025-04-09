// Import the MCP Server SDK
import { McpServer, ResourceTemplate, Events } from "@modelcontextprotocol/sdk/dist/esm/server.js";
// Import additional needed modules
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Create a new MCP Server instance
const server = new McpServer({
  name: "NoStr MCP Demo Server",
  version: "1.0.0",
  // Define the models available on this server
  models: [
    {
      id: "demo-model", 
      name: "Demo Model",
      capabilities: {
        completion: true,
        chat: true,
        embeddings: false
      },
      description: "A demonstration model for the NoStr MCP POC"
    }
  ]
});

// Define a template for chat completions
const chatTemplate = new ResourceTemplate("chat", {
  system_prompt: { type: "string", required: false },
  messages: { 
    type: "array", 
    required: true,
    items: {
      type: "object",
      properties: {
        role: { type: "string", enum: ["user", "assistant", "system"] },
        content: { type: "string" }
      }
    }
  },
  max_tokens: { type: "integer", required: false, default: 1024 }
});

// Register the chat template with the server
server.registerTemplate(chatTemplate);

// Handle chat completion requests
server.on(Events.RESOURCE_CREATE, async (ctx) => {
  if (ctx.template.name === "chat") {
    try {
      const { messages } = ctx.body;
      console.error(`Processing chat request with ${messages.length} messages`);
      
      // Get the last message from the user
      const lastUserMessage = messages.filter(m => m.role === "user").pop();
      
      // Simple echo response with some processing indication
      const response = {
        id: ctx.resource.id,
        model: "demo-model",
        output: {
          message: {
            role: "assistant",
            content: `MCP Server processed: "${lastUserMessage?.content || "No message found"}"`
          }
        },
        usage: {
          prompt_tokens: messages.reduce((acc, m) => acc + (m.content?.length || 0), 0),
          completion_tokens: 50,
          total_tokens: messages.reduce((acc, m) => acc + (m.content?.length || 0), 0) + 50
        }
      };
      
      // Send the response
      ctx.emit("complete", response);
      ctx.finish();
      
    } catch (error) {
      console.error("Error processing chat request:", error);
      ctx.emit("error", { message: "Failed to process chat request" });
      ctx.finish();
    }
  }
});

// Add general error handling
server.on(Events.ERROR, (error) => {
  console.error("MCP Server error:", error);
});

// Add shutdown handler
process.on('SIGINT', () => {
  console.error("Shutting down MCP Server...");
  server.close();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error("Uncaught exception:", error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
});

// Initialize the server with STDIO
try {
  server.initStdio();
  console.error("MCP Server started and waiting for input...");
} catch (error) {
  console.error("Failed to initialize MCP Server:", error);
  process.exit(1);
}

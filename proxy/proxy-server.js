import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { generatePrivateKey, getPublicKey, relayInit, finishEvent } from 'nostr-tools';
import WebSocket from 'ws';

// Provide a global WebSocket for environments that might not have it
global.WebSocket = WebSocket;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// NoStr configuration
const privateKey = generatePrivateKey(); // or use a fixed private key for consistency
const publicKey = getPublicKey(privateKey);
const relayUrl = 'https://dev-relay.dephy.dev'; // Example NoStr relay
const relay = relayInit(relayUrl);

// Path to MCP server
const mcpServerPath = path.join(__dirname, '../server/mcp-server.js');

let mcpProcess = null;

// Connect to NoStr relay
async function connectToRelay() {
  try {
    await relay.connect();
    console.log(`Connected to NoStr relay: ${relayUrl}`);
    
    // Subscribe to events from the client proxy
    const sub = relay.sub([
      {
        kinds: [1573], // Regular text note events
        "#t": ["mcp-request"], // Tag for MCP requests
      }
    ]);
    
    sub.on('event', async (event) => {
      try {
        const content = JSON.parse(event.content);
        console.log('Received message from NoStr:', content.message);
        
        // Send the message to the MCP server via STDIO
        if (mcpProcess && mcpProcess.stdin.writable) {
          // Format as MCP protocol request
          const mcpRequest = {
            jsonrpc: "2.0",
            method: "resource.create",
            id: Math.floor(Math.random() * 10000),
            params: {
              template: "chat",
              body: {
                messages: [
                  {
                    role: "user",
                    content: content.message
                  }
                ]
              }
            }
          };
          
          mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
        } else {
          console.error('MCP server process is not available');
        }
      } catch (error) {
        console.error('Error processing NoStr event:', error);
      }
    });
    
  } catch (error) {
    console.error('Failed to connect to NoStr relay:', error);
    setTimeout(connectToRelay, 5000); // Retry connection
  }
}

// Publish response back to NoStr network
async function publishToNoStr(message) {
  try {
    // Create event
    const event = {
      kind: 1573,
      pubkey: publicKey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['s', '0'], ['p', publicKey]], // Tag for MCP responses
      content: JSON.stringify({ message })
    };
    
    // Sign the event
    const signedEvent = finishEvent(event, privateKey);
    
    // Publish to relay
    try {
      await relay.publish(signedEvent);
      console.log('Response published to NoStr relay');
    } catch (publishError) {
      console.error('Failed to publish response to NoStr:', publishError);
    }
  } catch (error) {
    console.error('Error publishing to NoStr:', error);
  }
}

// Start MCP server process
function startMCPServer() {
  try {
    mcpProcess = spawn('node', ['--experimental-modules', '--es-module-specifier-resolution=node', mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    mcpProcess.stdout.on('data', (data) => {
      try {
        const lines = data.toString().trim().split('\n');
        
        for (const line of lines) {
          if (!line || !line.trim()) continue;
          
          try {
            const response = JSON.parse(line);
            console.log('Received response from MCP server:', response);
            
            // Handle only valid JSON responses
            if (response && (response.message || response.output || response.error)) {
              let messageContent = 'Response from MCP server';
              
              if (response.error) {
                messageContent = `Error: ${response.error}`;
              } else if (response.message) {
                messageContent = response.message;
              } else if (response.output?.message?.content) {
                messageContent = response.output.message.content;
              }
              
              // Publish the response back to NoStr
              publishToNoStr(messageContent);
            }
          } catch (parseError) {
            // Ignore parsing errors for non-JSON output
            console.debug('Non-JSON output from MCP server:', line);
          }
        }
      } catch (error) {
        console.error('Error processing MCP server output:', error);
      }
    });
    
    mcpProcess.stderr.on('data', (data) => {
      // Log stderr output as debug info
      console.debug(`MCP server log: ${data.toString()}`);
    });
    
    mcpProcess.on('close', (code) => {
      console.log(`MCP server process exited with code ${code}`);
      mcpProcess = null;
      
      // Restart the process if it crashes
      setTimeout(startMCPServer, 5000);
    });
    
    console.log('MCP server process started');
  } catch (error) {
    console.error('Failed to start MCP server process:', error);
    setTimeout(startMCPServer, 5000);
  }
}

// Initialize
async function initialize() {
  await connectToRelay();
  startMCPServer();
}

initialize().catch(console.error);

// Handle process termination
process.on('SIGINT', () => {
  if (mcpProcess) {
    mcpProcess.kill();
  }
  relay.close();
  process.exit(0);
});

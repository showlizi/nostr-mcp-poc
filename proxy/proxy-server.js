import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { finalizeEvent, Relay } from 'nostr-tools';
import 'websocket-polyfill';
import * as utils from '../utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a logger for this component
const logger = utils.createLogger('SERVER-PROXY');

// Get configuration
const senderSecretKey = utils.getSenderSecretKey();
const publicKey = utils.getSenderPublicKey(senderSecretKey);
const relayUrl = utils.getRelayUrl();

logger.info(`Initialized with public key: ${publicKey}`);
logger.info(`Using relay URL: ${relayUrl}`);

// Path to MCP server
const mcpServerPath = path.join(__dirname, '../server/mcp-server.js');

// Relay and process state
let relay = null;
let subscription = null;
let mcpProcess = null;
let isProcessingRequest = false;
let requestQueue = [];

/**
 * Connect to NoStr relay with retry mechanism
 */
async function connectToRelay() {
  try {
    if (relay) {
      // Close previous connection if exists
      try {
        relay.close();
      } catch (e) {
        logger.debug('Error closing previous relay connection:', e);
      }
    }
    
    // Initialize relay and connect
    relay = new Relay(relayUrl);
    await relay.connect();
    
    logger.info(`Connected to NoStr relay: ${relayUrl}`);
    
    // Subscribe to messages
    setupSubscription();
    
  } catch (error) {
    logger.error('Failed to connect to NoStr relay:', error);
    setTimeout(connectToRelay, 5000); // Retry connection after 5 seconds
  }
}

/**
 * Setup subscription to NoStr events
 */
function setupSubscription() {
  try {
    // Create filter for events
    const filter = {
      kinds: [1573], // DePHY message kind
      "#p": [publicKey], // Events addressed to us
    };
    
    // Subscribe
    subscription = relay.subscribe([filter], {
      onevent: handleNostrEvent,
      oneose: () => {
        logger.info('EOSE: Subscription is now active and receiving real-time events');
      }
    });
    
    logger.info('NoStr subscription created');
  } catch (error) {
    logger.error('Error setting up NoStr subscription:', error);
  }
}

/**
 * Handle incoming NoStr events
 */
function handleNostrEvent(event) {
  try {
    logger.info('Received NoStr event:', {
      id: event.id,
      pubkey: event.pubkey,
      created_at: new Date(event.created_at * 1000).toLocaleString()
    });
    
    // Parse content
    let content;
    try {
      content = JSON.parse(event.content);
    } catch (e) {
      content = { message: event.content };
    }
    
    // Extract message
    const message = content.message || "Empty message";
    
    // Queue the request for processing
    queueRequest(message, event.pubkey);
    
  } catch (error) {
    logger.error('Error processing NoStr event:', error);
  }
}

/**
 * Queue a request and process it when ready
 * @param {string} message The message to process
 * @param {string} senderPubkey The sender's public key
 */
function queueRequest(message, senderPubkey) {
  requestQueue.push({ message, senderPubkey });
  logger.info(`Request queued. Queue length: ${requestQueue.length}`);
  
  // Start processing if not already processing
  if (!isProcessingRequest) {
    processNextRequest();
  }
}

/**
 * Process the next request in the queue
 */
function processNextRequest() {
  if (requestQueue.length === 0) {
    isProcessingRequest = false;
    return;
  }
  
  isProcessingRequest = true;
  const { message, senderPubkey } = requestQueue.shift();
  
  // Send to MCP server
  sendToMcpServer(message, senderPubkey);
}

/**
 * Send a message to the MCP server
 * @param {string} message The message to send
 * @param {string} senderPubkey The sender's public key for response routing
 */
function sendToMcpServer(message, senderPubkey) {
  try {
    // Make sure MCP server is running
    if (!mcpProcess || !mcpProcess.stdin.writable) {
      logger.warn('MCP server not available, starting...');
      startMCPServer();
      // Re-queue the request and process later
      requestQueue.unshift({ message, senderPubkey });
      setTimeout(processNextRequest, 1000);
      return;
    }
    
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
              content: message
            }
          ]
        },
        metadata: {
          senderPubkey // Include sender pubkey for response routing
        }
      }
    };
    
    // Send to MCP server
    mcpProcess.stdin.write(JSON.stringify(mcpRequest) + '\n');
    logger.info('Request sent to MCP server');
    
  } catch (error) {
    logger.error('Error sending to MCP server:', error);
    // Try to process next request
    isProcessingRequest = false;
    processNextRequest();
  }
}

/**
 * Publish a response back to NoStr network
 * @param {string} message The response message
 * @param {string} recipientPubkey The recipient's public key
 */
async function publishResponse(message, recipientPubkey) {
  try {
    // Format the content
    const contentObj = {
      type: 'mcp-response',
      message: message,
      timestamp: new Date().toISOString()
    };
    const contentStr = JSON.stringify(contentObj);
    
    // Create and finalize event
    const event = finalizeEvent({
      kind: 1573, // DePHY message kind
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["s", "0"], // Subject tag
        ["p", recipientPubkey] // Recipient tag
      ],
      content: contentStr,
    }, senderSecretKey);
    
    logger.info('Publishing response to NoStr:', {
      id: event.id,
      recipient: recipientPubkey,
      content: contentStr.length > 100 ? contentStr.substring(0, 100) + '...' : contentStr
    });
    
    // Make sure relay is connected
    if (!relay || !relay.connected) {
      await connectToRelay();
    }
    
    // Publish to relay
    await relay.publish(event);
    
    logger.info('Response published to NoStr relay');
    
    // Process next request
    isProcessingRequest = false;
    processNextRequest();
    
  } catch (error) {
    logger.error('Error publishing response:', error);
    // Still try to process next request
    isProcessingRequest = false;
    processNextRequest();
  }
}

/**
 * Start the MCP server process
 */
function startMCPServer() {
  try {
    if (mcpProcess) {
      try {
        mcpProcess.kill();
      } catch (e) {
        logger.debug('Error killing existing MCP process:', e);
      }
    }
    
    mcpProcess = spawn('node', ['--experimental-modules', '--es-module-specifier-resolution=node', mcpServerPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let buffer = '';
    
    mcpProcess.stdout.on('data', (data) => {
      try {
        buffer += data.toString();
        
        // Process complete JSON objects
        let jsonEndIndex;
        while ((jsonEndIndex = buffer.indexOf('\n')) !== -1) {
          const jsonStr = buffer.substring(0, jsonEndIndex);
          buffer = buffer.substring(jsonEndIndex + 1);
          
          if (!jsonStr.trim()) continue;
          
          try {
            const response = JSON.parse(jsonStr);
            logger.info('Received response from MCP server');
            
            // Extract message content and sender pubkey
            let messageContent = 'Response from MCP server';
            let recipientPubkey = utils.getRecipientPublicKey(); // Default recipient
            
            if (response.error) {
              messageContent = `Error: ${response.error}`;
            } else if (response.message) {
              messageContent = response.message;
            } else if (response.output?.message?.content) {
              messageContent = response.output.message.content;
            }
            
            // Try to get the original sender pubkey from metadata
            if (response.params?.metadata?.senderPubkey) {
              recipientPubkey = response.params.metadata.senderPubkey;
            }
            
            // Publish the response back to NoStr
            publishResponse(messageContent, recipientPubkey);
            
          } catch (parseError) {
            logger.debug('Non-JSON output from MCP server:', jsonStr);
          }
        }
      } catch (error) {
        logger.error('Error processing MCP server output:', error);
      }
    });
    
    mcpProcess.stderr.on('data', (data) => {
      logger.debug(`MCP server log: ${data.toString()}`);
    });
    
    mcpProcess.on('close', (code) => {
      logger.warn(`MCP server process exited with code ${code}`);
      mcpProcess = null;
      
      // Restart the process if it crashes
      setTimeout(startMCPServer, 5000);
    });
    
    logger.info('MCP server process started');
  } catch (error) {
    logger.error('Failed to start MCP server process:', error);
    setTimeout(startMCPServer, 5000);
  }
}

/**
 * Initialize everything
 */
async function initialize() {
  try {
    await connectToRelay();
    startMCPServer();
  } catch (error) {
    logger.error('Initialization error:', error);
    process.exit(1);
  }
}

// Start initialization
initialize();

// Handle process termination
process.on('SIGINT', () => {
  logger.info('Shutting down server proxy...');
  if (mcpProcess) {
    mcpProcess.kill();
  }
  if (subscription) {
    subscription.close();
  }
  if (relay) {
    relay.close();
  }
  process.exit(0);
});
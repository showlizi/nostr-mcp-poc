import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { finalizeEvent, Relay } from 'nostr-tools';
import 'websocket-polyfill';
import * as utils from '../utils.js';

const app = express();
const port = 3001;

// Create a logger for this component
const logger = utils.createLogger('CLIENT-PROXY');

// Get configuration
const senderSecretKey = utils.getSenderSecretKey();
const publicKey = utils.getSenderPublicKey(senderSecretKey);
const relayUrl = utils.getRelayUrl();

logger.info(`Initialized with public key: ${publicKey}`);
logger.info(`Using relay URL: ${relayUrl}`);

// Store connected clients
const clients = new Map();
let clientIdCounter = 1;

// Relay instance
let relay = null;
let subscription = null;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(bodyParser.json());

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
    
    // Subscribe to responses
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
    
    // Broadcast to all connected clients
    broadcastToClients(content.message || "Received message from server");
  } catch (error) {
    logger.error('Error processing NoStr event:', error);
  }
}

// SSE setup
app.get('/events', (req, res) => {
  const clientId = clientIdCounter++;
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  });
  
  // Send an initial message
  res.write(`data: ${JSON.stringify({ message: 'Connected to proxy server' })}\n\n`);
  
  // Store the client connection
  clients.set(clientId, res);
  
  logger.info(`Client ${clientId} connected`);
  
  // Handle client disconnect
  req.on('close', () => {
    clients.delete(clientId);
    logger.info(`Client ${clientId} disconnected`);
  });
});

// Handle incoming messages from client
app.post('/message', async (req, res) => {
  try {
    const { message } = req.body;
    logger.info('Received message from client:', message);
    
    // Check if message is empty
    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message cannot be empty' });
    }
    
    // Send the message over NoStr
    const result = await publishMessage(message);
    
    if (result.success) {
      res.status(200).json({ 
        status: 'Message sent', 
        id: result.event.id 
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Error handling message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

/**
 * Publish a message to NoStr network
 * @param {string} message The message to publish
 * @returns {Promise<Object>} Result of the publishing operation
 */
/**
 * Publish a message to NoStr network
 * @param {string} message The message to publish
 * @returns {Promise<Object>} Result of the publishing operation
 */
async function publishMessage(message) {
  try {
    // Format the content
    const contentObj = {
      type: 'mcp-request',
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
        ["p", utils.getRecipientPublicKey()] // Recipient tag
      ],
      content: contentStr,
    }, senderSecretKey);
    
    logger.info('Publishing message to NoStr:', {
      id: event.id,
      recipient: utils.getRecipientPublicKey(),
      content: contentStr.length > 100 ? contentStr.substring(0, 100) + '...' : contentStr
    });
    
    // Make sure relay is connected
    if (!relay || !relay.connected) {
      await connectToRelay();
    }
    
    // Publish to relay
    await relay.publish(event);
    
    logger.info('Message published to NoStr relay');
    return { success: true, event };
  } catch (error) {
    logger.error('Error publishing message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Broadcast message to all SSE clients
 * @param {string} message The message to broadcast
 */
function broadcastToClients(message) {
  try {
    const disconnectedClients = [];
    
    for (const [clientId, client] of clients.entries()) {
      try {
        client.write(`data: ${JSON.stringify({ message })}\n\n`);
      } catch (clientError) {
        logger.error(`Error sending message to client ${clientId}:`, clientError);
        disconnectedClients.push(clientId);
      }
    }
    
    // Clean up disconnected clients
    for (const clientId of disconnectedClients) {
      clients.delete(clientId);
      logger.info(`Removed disconnected client ${clientId}`);
    }
  } catch (error) {
    logger.error('Error broadcasting message:', error);
  }
}

// Start the server
app.listen(port, () => {
  logger.info(`Client proxy running at http://localhost:${port}`);
  connectToRelay();
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down client proxy...');
  if (subscription) {
    subscription.close();
  }
  if (relay) {
    relay.close();
  }
  process.exit(0);
});
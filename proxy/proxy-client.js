import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { generatePrivateKey, getPublicKey, relayInit, finishEvent } from 'nostr-tools';
import WebSocket from 'ws';

// Provide a global WebSocket for environments that might not have it
global.WebSocket = WebSocket;

const app = express();
const port = 3001;

// NoStr configuration
const privateKey = generatePrivateKey(); // or use a fixed private key for consistency
const publicKey = getPublicKey(privateKey);
const relayUrl = 'wss://relay.damus.io'; // Example NoStr relay
const relay = relayInit(relayUrl);

// Store connected clients
const clients = new Map();
let clientIdCounter = 1;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(bodyParser.json());

// Connect to NoStr relay
async function connectToRelay() {
  try {
    await relay.connect();
    console.log(`Connected to NoStr relay: ${relayUrl}`);
    
    // Subscribe to events from the server proxy
    const sub = relay.sub([
      {
        kinds: [1], // Regular text note events
        "#t": ["mcp-response"], // Tag for MCP responses
      }
    ]);
    
    sub.on('event', (event) => {
      try {
        const content = JSON.parse(event.content);
        broadcastToClients(content.message || "Received message from server");
      } catch (error) {
        console.error('Error processing NoStr event:', error);
        broadcastToClients("Error processing response");
      }
    });
    
  } catch (error) {
    console.error('Failed to connect to NoStr relay:', error);
    setTimeout(connectToRelay, 5000); // Retry connection
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
  
  console.log(`Client ${clientId} connected`);
  
  // Handle client disconnect
  req.on('close', () => {
    clients.delete(clientId);
    console.log(`Client ${clientId} disconnected`);
  });
});

// Handle incoming messages from client
app.post('/message', async (req, res) => {
  try {
    const { message } = req.body;
    console.log('Received message from client:', message);
    
    // Send the message over NoStr
    await publishToNoStr(message);
    
    res.status(200).json({ status: 'Message sent to NoStr relay' });
  } catch (error) {
    console.error('Error handling message:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
});

// Publish message to NoStr network
async function publishToNoStr(message) {
  try {
    // Create event
    const event = {
      kind: 1,
      pubkey: publicKey,
      created_at: Math.floor(Date.now() / 1000),
      tags: [['t', 'mcp-request']], // Tag for MCP requests
      content: JSON.stringify({ message })
    };
    
    // Sign the event
    const signedEvent = finishEvent(event, privateKey);
    
    // Publish to relay
    try {
      await relay.publish(signedEvent);
      console.log('Message published to NoStr relay');
    } catch (publishError) {
      console.error('Failed to publish to NoStr:', publishError);
    }
  } catch (error) {
    console.error('Error publishing to NoStr:', error);
    throw error;
  }
}

// Broadcast message to all SSE clients
function broadcastToClients(message) {
  try {
    for (const client of clients.values()) {
      try {
        client.write(`data: ${JSON.stringify({ message })}\n\n`);
      } catch (clientError) {
        console.error(`Error sending message to client: ${clientError.message}`);
        // Remove the problematic client
        clients.forEach((value, key) => {
          if (value === client) {
            clients.delete(key);
            console.log(`Removed disconnected client ${key}`);
          }
        });
      }
    }
  } catch (error) {
    console.error(`Error broadcasting message: ${error.message}`);
  }
}

// Start the server
app.listen(port, () => {
  console.log(`Client proxy running at http://localhost:${port}`);
  connectToRelay();
});

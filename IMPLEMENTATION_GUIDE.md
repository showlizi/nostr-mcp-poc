# Implementation Guide

This guide explains how to apply the enhancements from the DePHY messaging layer to the NoStr MCP PoC project.

## Directory Structure

Create the following directory structure:

```
nostr-mcp-poc/
├── .env                  # Combined configuration
├── package.json          # Updated dependencies
├── utils.js              # Shared utility functions
├── client/
│   ├── client.js         # Web client server (unchanged)
│   └── public/           # Web client files (unchanged)
├── proxy/
│   ├── proxy-client.js   # Enhanced client proxy
│   └── proxy-server.js   # Enhanced server proxy
└── server/
    └── mcp-server.js     # Enhanced MCP server
```

## Step-by-Step Implementation

### 1. Update Dependencies

Replace your existing `package.json` with the enhanced version:

```bash
# Install new dependencies
npm install @noble/hashes@^1.3.2 nostr-tools@^2.1.3 websocket-polyfill@^0.0.3
```

### 2. Add Utility Functions

Create a new `utils.js` file in the project root with the provided utility functions:

- Key management functions
- Connection utilities
- Logging helpers

### 3. Update Configuration

Create or update the `.env` file with the combined configuration settings:
- NoStr/DePHY configuration
- MCP server settings
- Logging preferences

### 4. Update Proxy Implementations

#### Client Proxy

Replace the existing `proxy/proxy-client.js` with the enhanced version that includes:
- Updated NoStr event handling
- Standardized message format (kind 1573)
- Better error handling and reconnection logic

#### Server Proxy

Replace the existing `proxy/proxy-server.js` with the enhanced version that includes:
- Request queuing
- Better process management
- Metadata preservation for routing

### 5. Update MCP Server

Replace the existing `server/mcp-server.js` with the enhanced version that includes:
- Better event handling
- Updated SDK usage
- Metadata preservation

### 6. Test the Implementation

1. Start all components:
   ```bash
   npm run start:all:concurrent
   ```

2. Open your browser to http://localhost:3000

3. Send a test message and verify it flows through the system correctly.

## Key Changes

### NoStr Event Structure

The enhanced implementation uses the DePHY standard event structure:

```javascript
{
  kind: 1573,
  created_at: timestamp,
  tags: [
    ["s", "0"],  // Subject tag (conversation identifier)
    ["p", recipientPubkey]  // Recipient public key
  ],
  content: contentStr,
  pubkey: senderPubkey,
  id: eventId,
  sig: signature
}
```

### Message Format

Messages now use a standardized JSON format:

```javascript
{
  type: "mcp-request" | "mcp-response",
  message: "The actual message content",
  timestamp: ISO8601String
}
```

### Connection Management

The enhanced implementation uses a more robust connection approach:

```javascript
// Initialize relay
relay = new Relay(relayUrl);
await relay.connect();

// Subscribe with proper filters
subscription = relay.subscribe([filter], {
  onevent: handleNostrEvent,
  oneose: () => { /* Handle subscription ready */ }
});

// Publishing with confirmation
const pub = relay.publish(event);
await pub.onSeen();
```

## Troubleshooting

### Connection Issues

If you experience connection issues with the NoStr relay:

1. Verify the relay URL in your `.env` file
2. Check if the relay supports the NoStr protocol version
3. Ensure your firewall allows WebSocket connections

### Message Routing Problems

If messages aren't being delivered correctly:

1. Check public/private key configurations
2. Verify the tags are formatted correctly
3. Ensure recipient keys match between proxies

### MCP Server Errors

If the MCP server isn't processing requests properly:

1. Check the MCP server logs for detailed error information
2. Verify the JSON format of requests being sent to the server
3. Ensure the MCP server correctly implements the MCP protocol
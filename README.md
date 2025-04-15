# Enhanced NoStr MCP Integration

This project demonstrates a communication flow between a client and an MCP (Model Context Protocol) server through the NoStr protocol, leveraging DePHY messaging layer's approach for decentralized messaging.

## Architecture Overview

```
Client <-- SSE --> Client Proxy <-- NoStr (DePHY Messaging) --> Server Proxy <-- STDIO --> MCP Server
```

The system provides secure, real-time communication between clients and MCP servers across networks using the decentralized NoStr protocol with the DePHY messaging layer patterns.

## Key Enhancements

This version includes several enhancements based on the DePHY messaging layer:

1. **Updated NoStr Protocol Implementation**: 
   - Uses the latest NoStr-tools library (v2.1.3)
   - Implements standardized message kind (1573) used by DePHY
   - Better message tag structure for routing

2. **Improved Connection Management**:
   - Enhanced reconnection logic
   - Proper relay connection lifecycle handling
   - Better subscription management

3. **Enhanced Error Handling**:
   - Comprehensive error trapping
   - Improved logging with component identification
   - Better error reporting through the response chain

4. **Better Code Organization**:
   - Shared utility functions
   - Separated concerns with clear module boundaries
   - Standardized logging format

5. **Queue-Based Processing**:
   - Server-side request queuing to avoid race conditions
   - Better handling of concurrent requests
   - Metadata preservation for routing responses

## Components

### 1. Client

The web client provides a simple interface for sending messages and receiving responses.

### 2. Client Proxy

The client proxy manages SSE connections with the web client and communicates with the NoStr network using DePHY messaging patterns.

Key functions:
- Handles SSE connections with web clients
- Publishes client messages to NoStr with appropriate tagging
- Subscribes to NoStr events for responses
- Routes responses back to web clients

### 3. Server Proxy

The server proxy bridges the NoStr network with the MCP server:

Key functions:
- Connects to the NoStr relay
- Subscribes to messages intended for the MCP server
- Manages the MCP server process
- Routes responses back to the appropriate clients
- Implements request queuing for better concurrency handling

### 4. MCP Server

A simple Model Context Protocol server implementation:

Key functions:
- Processes requests in standard MCP format
- Provides appropriate MCP responses
- Preserves metadata for response routing

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/nostr-mcp-poc.git
cd nostr-mcp-poc

# Install dependencies
npm install
```

## Configuration

Edit the `.env` file to set your configuration:

```
# NoStr/DePHY Configuration
SENDER_SECRET_KEY=your_private_key_here
RECIPIENT_PUBLIC_KEY=recipient_public_key_here
RELAY_URL=wss://your-nostr-relay.com

# MCP Server Configuration
SERVER_NAME=Your Server Name
SERVER_VERSION=1.0.0
MODEL_ID=your-model-id
MODEL_NAME=Your Model Name
```

## Running the Application

You can start all components in one of these ways:

### Using Concurrently (Recommended)

```bash
npm run start:all:concurrent
```

### Using Individual Terminals

```bash
# Terminal 1 - Start the MCP Server
npm run start:server

# Terminal 2 - Start the Server Proxy
npm run start:proxy2

# Terminal 3 - Start the Client Proxy
npm run start:proxy1

# Terminal 4 - Start the Client Web Server
npm run start:client
```

### Using tmux

```bash
npm run start:all
```

## Using the Application

1. Open your browser to http://localhost:3000
2. Type a message and send it
3. The message will flow through the system:
   - Client → Client Proxy → NoStr Network → Server Proxy → MCP Server
   - Response follows the reverse path

## Message Flow Details

1. **Client to Client Proxy**:
   - User enters a message in the web interface
   - Client sends a POST request to the proxy
   - Client maintains an SSE connection for responses

2. **Client Proxy to NoStr**:
   - Creates a NoStr event with kind 1573 (DePHY standard)
   - Tags message with subject and recipient information
   - Signs with sender's private key
   - Publishes to NoStr relay

3. **NoStr to Server Proxy**:
   - Server proxy subscribes to relevant events
   - Processes event content
   - Queues requests for orderly processing

4. **Server Proxy to MCP Server**:
   - Formats message as MCP protocol request
   - Preserves metadata for response routing
   - Sends to MCP server via STDIO

5. **MCP Server Processing**:
   - Processes request according to MCP protocol
   - Generates appropriate response
   - Returns response with preserved metadata

6. **Response Chain**:
   - Server proxy receives response from MCP server
   - Creates NoStr event with response
   - Routes back through NoStr to client proxy
   - Client proxy delivers to web client via SSE

## Security Considerations

- **Key Management**: The system uses public/private key cryptography via NoStr. For production, implement proper key management.
- **Message Encryption**: Consider implementing end-to-end encryption for sensitive data.
- **Authentication**: Implement authentication for production use.
- **Rate Limiting**: Add rate limiting to prevent abuse.

## Advanced Configuration

### Custom NoStr Relay

To use your own NoStr relay:

1. Set up a NoStr relay server
2. Update the `RELAY_URL` in your `.env` file

### Persistent Identities

For stable identities:

1. Generate private keys and save them securely
2. Configure both proxies with fixed keys via the `.env` file

## License

MIT
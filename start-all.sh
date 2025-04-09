#!/bin/bash

# Script to start all components of the NoStr MCP PoC

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "tmux is required to run this script. Please install it first."
    exit 1
fi

# Create a new tmux session
tmux new-session -d -s nostr-mcp

# Split the window into 4 panes
tmux split-window -h -t nostr-mcp:0.0
tmux split-window -v -t nostr-mcp:0.0
tmux split-window -v -t nostr-mcp:0.2

# Run each component in its own pane
tmux send-keys -t nostr-mcp:0.0 "cd $(pwd) && echo 'Starting MCP Server...' && npm run start:server" C-m
tmux send-keys -t nostr-mcp:0.1 "cd $(pwd) && echo 'Starting Server Proxy...' && sleep 2 && npm run start:proxy2" C-m
tmux send-keys -t nostr-mcp:0.2 "cd $(pwd) && echo 'Starting Client Proxy...' && sleep 4 && npm run start:proxy1" C-m
tmux send-keys -t nostr-mcp:0.3 "cd $(pwd) && echo 'Starting Client Server...' && sleep 6 && npm run start:client" C-m

# Attach to the tmux session
tmux attach-session -t nostr-mcp

# Note: To exit, press Ctrl+B, then type :kill-session and press Enter

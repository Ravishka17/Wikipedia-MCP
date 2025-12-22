#!/bin/bash

# Test script for MCP endpoint
echo "Testing MCP endpoint: $1"
echo ""

ENDPOINT="${1:-http://localhost:8000/mcp}"

echo "1. Testing GET /mcp (server info)..."
curl -s -X GET "$ENDPOINT" | head -20
echo ""
echo ""

echo "2. Testing POST /mcp (initialize)..."
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {}
  }' | jq . 

echo ""
echo ""

echo "3. Testing POST /mcp (tools/list)..."
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }' | jq '.result.tools[]?.name' 

echo ""
echo "4. Testing POST /mcp (tools/call - search_wikipedia)..."
curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "search_wikipedia",
      "arguments": {
        "query": "artificial intelligence",
        "limit": 3
      }
    }
  }' | jq .

echo ""
echo "✅ Tests completed!"
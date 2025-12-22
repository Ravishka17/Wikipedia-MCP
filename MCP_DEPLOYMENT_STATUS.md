# MCP Deployment Status - Vercel

## ⚠️ Current Status: Not Working for Standard MCP Clients

The Wikipedia MCP server **cannot work with standard MCP clients** when deployed to Vercel due to fundamental architectural limitations.

## The Problem

### Error: HTTP 404 on POST /mcp
**Cause**: Vercel's serverless architecture doesn't support the MCP HTTP transport protocol properly.

### Error: SSE Content Type Error
**Cause**: Vercel serverless functions cannot maintain persistent connections required for Server-Sent Events.

## Why It Doesn't Work

1. **Vercel Serverless Limitations**:
   - Functions are short-lived (max 10-60 seconds)
   - No persistent connections
   - No streaming support
   - State is not maintained between requests

2. **MCP Protocol Requirements**:
   - **SSE Transport**: Requires persistent HTTP connections for Server-Sent Events
   - **HTTP Transport**: Requires proper JSON-RPC over HTTP with session management
   - Both require stateful connections that Vercel cannot provide

3. **Current Implementation**:
   - Uses `@modelcontextprotocol/sdk` which expects persistent connections
   - SSE transport requires ongoing connection to `/sse` endpoint
   - HTTP transport requires session management across requests

## What Actually Works

### ✅ REST API Endpoints (100% Functional)
All REST endpoints work perfectly on Vercel:

- `GET /health` - Health check
- `GET /mcp` - Server info (non-MCP JSON)
- `GET /search/:query` - Search Wikipedia
- `GET /article/:title` - Get full article
- `GET /summary/:title` - Get summary
- `GET /sections/:title` - Get sections
- `GET /links/:title` - Get links
- `GET /coordinates/:title` - Get coordinates
- `GET /related/:title` - Get related topics
- `GET /facts/:title` - Extract facts
- `GET /test-connectivity` - Test Wikipedia API
- `GET /supported-countries` - List supported countries

### ❌ MCP Protocol Endpoints (Non-functional)
- `POST /mcp` - Does not work with standard MCP clients
- `GET /sse` - Cannot work on Vercel (no persistent connections)
- `POST /messages` - Cannot work without SSE

## Solutions

### Solution 1: Use REST API Instead (Recommended)

For Vercel deployment, use the REST API directly:

```bash
# Search
curl https://your-app.vercel.app/search/artificial%20intelligence

# Get article
curl https://your-app.vercel.app/article/Artificial_intelligence

# Get summary
curl https://your-app.vercel.app/summary/Artificial_intelligence
```

### Solution 2: Self-Host for Full MCP Support

Deploy on a platform that supports persistent connections:

```bash
git clone <your-repo>
cd wikipedia-mcp-vercel
npm install
npm run dev
```

**Platforms that support MCP:**
- Railway.app
- Render.com
- Fly.io
- Any VPS (DigitalOcean, AWS EC2, etc.)
- Local deployment

### Solution 3: Deploy on Edge Runtime with Durable Objects

For Vercel-specific solution, you'd need:
- Vercel Edge Runtime with Durable Objects (complex)
- Or use Cloudflare Workers with Durable Objects
- Significant architectural changes to support stateful MCP

## Testing Your Deployment

```bash
# Test REST API (works on Vercel)
curl https://your-app.vercel.app/health
curl https://your-app.vercel.app/mcp
curl https://your-app.vercel.app/search/test

# MCP endpoints will not work - you'll get 404s or timeouts
```

## Recommendation

For the URL `https://wikipedia-mcp-zeta.vercel.app`, you have two options:

1. **Use it as a REST API** - Works perfectly, but not as MCP
2. **Deploy elsewhere for MCP** - Use Railway, Render, etc. for full MCP functionality

If you need MCP protocol support, I recommend deploying to Railway.app or similar platforms that support persistent connections.

## Technical Details

The fundamental issue is that MCP was designed for persistent, stateful connections, while Vercel serverless is designed for stateless, short-lived requests. This architectural mismatch cannot be resolved without either:

1. Changing the MCP protocol to be stateless (requires MCP spec changes)
2. Changing the hosting platform to support stateful connections
3. Implementing complex workarounds with external state storage

For now, the best solution is to use the REST API on Vercel or deploy to a platform that supports persistent connections for full MCP functionality.
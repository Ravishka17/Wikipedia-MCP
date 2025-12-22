# MCP Connection Guide for Vercel Deployment

## Important: Vercel Serverless Limitations

**Server-Sent Events (SSE) are NOT supported** on Vercel's serverless platform because:
- Vercel functions are stateless and short-lived
- SSE requires persistent connections
- HTTP streaming is not supported in serverless environments

## ✅ How to Connect (Works with Vercel)

Use **HTTP Transport** instead of SSE:

### Claude Desktop Configuration

```json
{
  "mcpServers": {
    "wikipedia": {
      "type": "http",
      "url": "https://wikipedia-mcp-zeta.vercel.app/mcp",
      "transport": "http"
    }
  }
}
```

### Other MCP Clients

Configure your MCP client to use:
- **Endpoint**: `https://wikipedia-mcp-zeta.vercel.app/mcp`
- **Transport**: HTTP (not SSE)
- **Method**: POST

## Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/mcp` | Direct MCP HTTP transport (✅ Recommended) |
| GET | `/mcp` | Server info and capabilities |
| GET | `/sse` | ⚠️ Not supported on Vercel |
| POST | `/messages` | ⚠️ Not supported on Vercel |
| GET | `/health` | Health check endpoint |

## Troubleshooting

### Error: "HTTP 404: Endpoint not found"
**Solution**: Make sure you're using `POST /mcp` with HTTP transport, not SSE.

### Error: "SSE error: Invalid content type"
**Solution**: SSE is not supported on Vercel. Switch to HTTP transport.

### Error: "Connection failed"
**Solution**: 
1. Verify the URL: `https://wikipedia-mcp-zeta.vercel.app/mcp`
2. Ensure you're using HTTP transport, not SSE
3. Check that your client supports HTTP transport

### Testing the Connection

You can test if the server is reachable:

```bash
# Check server info (GET)
curl https://wikipedia-mcp-zeta.vercel.app/mcp

# Health check
curl https://wikipedia-mcp-zeta.vercel.app/health

# Test MCP endpoint (should return error for GET on POST-only endpoint)
curl -X POST https://wikipedia-mcp-zeta.vercel.app/mcp
```

## Alternative: Self-Hosting (if you need SSE)

If you require SSE transport, you'll need to self-host the server:

```bash
git clone <repository>
cd wikipedia-mcp-vercel
npm install
cp .env.example .env
npm run dev
```

This will run on `http://localhost:8000` with full SSE support.

## Notes

- The Vercel deployment provides the same functionality as self-hosted, just using HTTP instead of SSE
- All 12 MCP tools work identically
- Performance may be better on Vercel due to edge locations
- No persistent connections = better scalability
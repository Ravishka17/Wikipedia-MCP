import { Application, Request, Response } from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { MCPServer } from '../mcp-server.js';
import { mcpLimiter } from '../middleware.js';
import { registerTools, registerPrompts } from '../toolRegistrations.js';

// ── Per-request server factory ────────────────────────────────────────────────
// Vercel's serverless model is inherently stateless — there is no persistent
// process between requests.  The correct pattern for Streamable HTTP on a
// stateless host is to create a fresh McpServer + transport for every request,
// delegating all actual logic to the stateless mcpHelper instance.
function createRequestServer(mcpHelper: MCPServer): McpServer {
  const server = new McpServer({
    name: 'wikipedia-mcp-server',
    version: '1.0.0'
  });
  registerTools(server, mcpHelper);
  registerPrompts(server, mcpHelper);
  return server;
}

export function registerMcpRoutes(app: Application, mcpHelper: MCPServer): void {

  // ── POST /mcp — client → server messages (the primary MCP channel) ─────────
  // Each request gets its own transport with sessionIdGenerator: undefined so
  // no Mcp-Session-Id header is issued and session management is disabled.
  // This is the correct mode for stateless/serverless deployments.
  app.post('/mcp', mcpLimiter, async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined   // stateless — no session ID issued
    });

    const server = createRequestServer(mcpHelper);

    // Clean up once the HTTP response closes (whether normally or abruptly)
    res.on('close', () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('MCP POST error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32603, message: 'Internal server error' }
        });
      }
    }
  });

  // ── GET /mcp — SSE channel for server-initiated messages ──────────────────
  // The Streamable HTTP spec (2025-03-26) allows clients to open a GET SSE
  // stream so the server can push notifications without an in-flight POST.
  // In stateless mode the transport opens the stream but no session-scoped
  // notifications are queued — this is fine for Wikipedia (read-only, no
  // server-push).  On Vercel the connection will close when the serverless
  // function times out; clients reconnect automatically.
  app.get('/mcp', mcpLimiter, async (req: Request, res: Response) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined
    });

    const server = createRequestServer(mcpHelper);

    res.on('close', () => {
      transport.close().catch(() => {});
      server.close().catch(() => {});
    });

    try {
      await server.connect(transport);
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error('MCP GET/SSE error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  });

  // ── DELETE /mcp — session termination ─────────────────────────────────────
  // In stateless mode there are no server-side sessions to tear down.
  // Acknowledge the request so spec-compliant clients don't see an error.
  app.delete('/mcp', (_req: Request, res: Response) => {
    res.status(200).end();
  });

  // ── Legacy /messages shim ──────────────────────────────────────────────────
  app.post('/messages', (_req: Request, res: Response) => {
    res.status(200).json({
      message: 'Use POST /mcp for MCP protocol communication.',
      instruction: 'Connect via Streamable HTTP transport (POST /mcp).'
    });
  });
}

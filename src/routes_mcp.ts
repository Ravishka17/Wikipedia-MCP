import { Application } from 'express';
import { MCPServer } from '../mcp-server.js';
import { mcpLimiter } from '../middleware.js';
import { formatToolResult } from '../utils.js';

export function registerMcpRoutes(app: Application, mcpHelper: MCPServer): void {

  // Legacy /messages endpoint
  app.post('/messages', async (req, res) => {
    console.log('MCP messages endpoint called');
    res.status(200).json({
      message: "Use POST /mcp for MCP protocol communication. SSE is not supported on Vercel.",
      instruction: "Please connect using HTTP transport to the /mcp endpoint"
    });
  });

  // MCP HTTP Transport Endpoint (POST for direct MCP communication)
  app.post('/mcp', mcpLimiter, async (req, res) => {
    console.log('MCP HTTP transport request received');
    res.setHeader('Content-Type', 'application/json');

    try {
      const requestData = req.body;
      console.log('MCP Request:', JSON.stringify(requestData, null, 2));

      // Notifications have no "id" — return 202 Accepted with no body
      if (requestData.id === undefined || requestData.id === null) {
        res.status(202).end();
        return;
      }

      if (requestData.method === 'initialize') {
        // Echo back the client's requested protocolVersion (required by spec)
        const clientVersion = requestData.params?.protocolVersion || '2024-11-05';
        res.json({
          jsonrpc: '2.0',
          id: requestData.id,
          result: {
            protocolVersion: clientVersion,
            capabilities: {
              tools: {},
              prompts: {}
            },
            serverInfo: {
              name: 'wikipedia-mcp-server',
              version: '1.0.0'
            }
          }
        });

      } else if (requestData.method === 'ping') {
        // Some clients send a ping after initialize
        res.json({ jsonrpc: '2.0', id: requestData.id, result: {} });

      } else if (requestData.method === 'tools/list') {
        res.json({
          jsonrpc: '2.0',
          id: requestData.id,
          result: {
            tools: mcpHelper.getServerInfo().tools
          }
        });

      } else if (requestData.method === 'tools/call') {
        const { name, arguments: args } = requestData.params;
        const result = await mcpHelper.executeTool(name, args);
        res.json({
          jsonrpc: '2.0',
          id: requestData.id,
          result: formatToolResult(result)
        });

      } else if (requestData.method === 'prompts/list') {
        res.json({
          jsonrpc: '2.0',
          id: requestData.id,
          result: {
            prompts: mcpHelper.getPromptsList()
          }
        });

      } else if (requestData.method === 'prompts/get') {
        const { name, arguments: args = {} } = requestData.params;
        try {
          const prompt = mcpHelper.getPrompt(name, args);
          res.json({
            jsonrpc: '2.0',
            id: requestData.id,
            result: prompt
          });
        } catch (err: any) {
          res.status(200).json({
            jsonrpc: '2.0',
            id: requestData.id,
            error: {
              code: -32602,
              message: err.message
            }
          });
        }

      } else {
        // Unknown method with an id — return JSON-RPC error (status 200, not 400)
        res.status(200).json({
          jsonrpc: '2.0',
          id: requestData.id,
          error: {
            code: -32601,
            message: `Method not found: ${requestData.method}`
          }
        });
      }

    } catch (error) {
      console.error('Error handling MCP request:', error);
      res.status(200).json({
        jsonrpc: '2.0',
        id: req.body?.id || null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : String(error)
        }
      });
    }
  });

  // GET /mcp — Streamable HTTP spec: return 405 to signal SSE not supported
  // This tells clients to use HTTP transport (POST only), not SSE
  app.get('/mcp', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(405).json({
      error: 'Method Not Allowed',
      message: 'This server uses Streamable HTTP transport. Use POST /mcp for MCP communication.'
    });
  });
}

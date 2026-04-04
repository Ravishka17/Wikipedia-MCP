import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { WikipediaClient } from './wikipedia-client.js';
import { MCPServer } from './mcp-server.js';
import { globalLimiter, removeServerHeader } from './middleware.js';
import { registerMcpRoutes } from './routes/mcp.js';
import { registerRestRoutes } from './routes/rest.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.set('trust proxy', 1);    // trust Vercel's edge proxy for X-Forwarded-For (required by express-rate-limit)
app.use(removeServerHeader);  // blanks Server header before any response
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(globalLimiter);

// Bot credentials — optional. If not set, server works without authentication.
const botConfig = {
  botUsername: process.env.WIKIPEDIA_BOT_USERNAME,
  botPassword: process.env.WIKIPEDIA_BOT_PASSWORD,
};

// Initialize Wikipedia client (used by REST routes)
const wikipediaClient = new WikipediaClient({
  language: process.env.WIKIPEDIA_LANGUAGE || 'en',
  country: process.env.WIKIPEDIA_COUNTRY,
  enableCache: process.env.ENABLE_CACHE === 'true',
  ...botConfig
});

// MCPServer helper — stateless, shared across requests.
// MCP SDK McpServer instances are created fresh per-request inside registerMcpRoutes
// to satisfy Streamable HTTP's stateless transport model on Vercel.
const mcpHelper = new MCPServer({
  language: process.env.WIKIPEDIA_LANGUAGE || 'en',
  country: process.env.WIKIPEDIA_COUNTRY,
  enableCache: process.env.ENABLE_CACHE === 'true',
  ...botConfig
});

// Register routes
registerMcpRoutes(app, mcpHelper);
registerRestRoutes(app, wikipediaClient, mcpHelper);

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error', message: error.message });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      'GET  /health',
      'POST /mcp',
      'GET  /mcp',
      'DELETE /mcp',
      'GET  /search/:query',
      'GET  /article/:title',
      'GET  /summary/:title',
      'GET  /sections/:title',
      'GET  /links/:title',
      'GET  /coordinates/:title',
      'GET  /related/:title',
      'GET  /summary/:title/query/:query/length/:maxLength',
      'GET  /summary/:title/section/:section/length/:maxLength',
      'GET  /facts/:title',
      'GET  /test-connectivity',
      'GET  /supported-countries',
      'POST /tools/:toolName'
    ]
  });
});

// Start server (local dev only)
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Wikipedia MCP Server running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  });
}

export default app;

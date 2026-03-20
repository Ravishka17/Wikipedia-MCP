import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { WikipediaClient } from './wikipedia-client.js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MCPServer } from './mcp-server.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// ── Middleware ───────────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate limiting ────────────────────────────────────────────────────────────
//
// LLMs can burst heavily in short windows, so limits are generous per-minute
// but protect against sustained abuse.  Three tiers:
//
//   1. globalLimiter   — catches everything that falls through the other two;
//                        120 req / min is comfortable for a single LLM session.
//   2. mcpLimiter      — tighter cap on the /mcp endpoint because each call may
//                        fan out to multiple Wikipedia API requests internally
//                        (e.g. multi_search_wikipedia with 20 parallel searches).
//   3. searchLimiter   — REST /search/* is the cheapest endpoint but most likely
//                        to be hammered by automated clients.
//
// All limiters use the standard `RateLimit-*` response headers (RFC 6585 draft)
// so clients can back off gracefully.

const globalLimiter = rateLimit({
  windowMs: 60_000,          // 1 minute
  max: 120,                  // 120 total requests per IP per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please wait before sending more requests.',
    retryAfter: 60
  }
});

const mcpLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,                   // 60 MCP tool calls per IP per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many MCP requests',
    message: 'MCP rate limit exceeded. Please wait before sending more tool calls.',
    retryAfter: 60
  }
});

const searchLimiter = rateLimit({
  windowMs: 60_000,
  max: 90,                   // 90 REST search requests per IP per minute
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many search requests',
    message: 'Search rate limit exceeded. Please wait before sending more requests.',
    retryAfter: 60
  }
});

// Apply global limiter to all routes
app.use(globalLimiter);

// ── Input sanitization (REST layer) ─────────────────────────────────────────
//
// The MCP layer already sanitizes inside MCPServer.executeTool().  This helper
// covers the REST endpoints that forward params directly to WikipediaClient.

const SQL_INJECTION_RE =
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE|REPLACE|MERGE)\b|--|;|\/\*|\*\/|xp_|0x[0-9a-fA-F]+)/gi;

function sanitizeParam(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\0/g, '')
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .replace(SQL_INJECTION_RE, '')
    .trim()
    .substring(0, maxLength);
}

// ── App config ───────────────────────────────────────────────────────────────

const botConfig = {
  botUsername: process.env.WIKIPEDIA_BOT_USERNAME,
  botPassword: process.env.WIKIPEDIA_BOT_PASSWORD,
};

const wikipediaClient = new WikipediaClient({
  language: process.env.WIKIPEDIA_LANGUAGE || 'en',
  country: process.env.WIKIPEDIA_COUNTRY,
  enableCache: process.env.ENABLE_CACHE === 'true',
  ...botConfig
});

const mcpHelper = new MCPServer({
  language: process.env.WIKIPEDIA_LANGUAGE || 'en',
  country: process.env.WIKIPEDIA_COUNTRY,
  enableCache: process.env.ENABLE_CACHE === 'true',
  ...botConfig
});

const mcpServer = new McpServer({
  name: 'wikipedia-mcp-server',
  version: '1.0.0'
});

const sessionStore = new Map<string, any>();

const formatToolResult = (result: any) => ({
  content: result.content.map((item: any) => ({
    type: item.type as 'text',
    text: item.text
  })),
  isError: result.isError ? true : undefined
});

// ── SDK tool registrations ───────────────────────────────────────────────────

mcpServer.tool('search_wikipedia',
  {
    query: z.string().max(500),
    limit: z.number().optional(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => formatToolResult(await mcpHelper.executeTool('search_wikipedia', args))
);

mcpServer.tool('get_article',
  {
    title: z.string().max(300),
    full: z.boolean().optional(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => formatToolResult(await mcpHelper.executeTool('get_article', args))
);

mcpServer.tool('get_summary',
  {
    title: z.string().max(300),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => formatToolResult(await mcpHelper.executeTool('get_summary', args))
);

mcpServer.tool('get_sections',
  {
    title: z.string().max(300),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => formatToolResult(await mcpHelper.executeTool('get_sections', args))
);

mcpServer.tool('get_links',
  {
    title: z.string().max(300),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => formatToolResult(await mcpHelper.executeTool('get_links', args))
);

mcpServer.tool('get_coordinates',
  {
    title: z.string().max(300),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => formatToolResult(await mcpHelper.executeTool('get_coordinates', args))
);

mcpServer.tool('get_related_topics',
  {
    title: z.string().max(300),
    limit: z.number().optional(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => formatToolResult(await mcpHelper.executeTool('get_related_topics', args))
);

mcpServer.tool('summarize_article_for_query',
  {
    title: z.string().max(300),
    query: z.string().max(500),
    max_length: z.number().optional(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => formatToolResult(await mcpHelper.executeTool('summarize_article_for_query', args))
);

mcpServer.tool('summarize_article_section',
  {
    title: z.string().max(300),
    section_title: z.string().max(300),
    max_length: z.number().optional(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => formatToolResult(await mcpHelper.executeTool('summarize_article_section', args))
);

mcpServer.tool('extract_key_facts',
  {
    title: z.string().max(300),
    topic_within_article: z.string().max(300).optional(),
    count: z.number().optional(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => formatToolResult(await mcpHelper.executeTool('extract_key_facts', args))
);

mcpServer.tool('test_wikipedia_connectivity',
  {
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => formatToolResult(await mcpHelper.executeTool('test_wikipedia_connectivity', args))
);

mcpServer.tool('list_supported_countries',
  {
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => formatToolResult(await mcpHelper.executeTool('list_supported_countries', args))
);

mcpServer.tool('multi_search_wikipedia',
  {
    searches: z.array(z.object({
      query: z.string().max(500),
      language: z.string().optional(),
      country: z.string().optional(),
      limit: z.number().optional()
    })).min(1).max(20)
  },
  async (args) => formatToolResult(await mcpHelper.executeTool('multi_search_wikipedia', args))
);

// ── Routes ───────────────────────────────────────────────────────────────────

// Legacy /messages endpoint
app.post('/messages', async (req, res) => {
  res.status(200).json({
    message: 'Use POST /mcp for MCP protocol communication. SSE is not supported on Vercel.',
    instruction: 'Please connect using HTTP transport to the /mcp endpoint'
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'wikipedia-mcp-server'
  });
});

// MCP endpoint — apply tighter limiter on top of global
app.post('/mcp', mcpLimiter, async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  try {
    const requestData = req.body;

    // Notifications have no id — return 202 Accepted with no body
    if (requestData.id === undefined || requestData.id === null) {
      res.status(202).end();
      return;
    }

    if (requestData.method === 'initialize') {
      const clientVersion = requestData.params?.protocolVersion || '2024-11-05';
      res.json({
        jsonrpc: '2.0',
        id: requestData.id,
        result: {
          protocolVersion: clientVersion,
          capabilities: { tools: {}, prompts: {} },
          serverInfo: { name: 'wikipedia-mcp-server', version: '1.0.0' }
        }
      });

    } else if (requestData.method === 'ping') {
      res.json({ jsonrpc: '2.0', id: requestData.id, result: {} });

    } else if (requestData.method === 'tools/list') {
      res.json({
        jsonrpc: '2.0',
        id: requestData.id,
        result: { tools: mcpHelper.getServerInfo().tools }
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
        result: { prompts: mcpHelper.getPromptsList() }
      });

    } else if (requestData.method === 'prompts/get') {
      const { name, arguments: args = {} } = requestData.params;
      try {
        const prompt = mcpHelper.getPrompt(name, args);
        res.json({ jsonrpc: '2.0', id: requestData.id, result: prompt });
      } catch (err: any) {
        res.status(200).json({
          jsonrpc: '2.0',
          id: requestData.id,
          error: { code: -32602, message: err.message }
        });
      }

    } else {
      res.status(200).json({
        jsonrpc: '2.0',
        id: requestData.id,
        error: { code: -32601, message: `Method not found: ${requestData.method}` }
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

// GET /mcp — signal that SSE is not supported; clients should use POST
app.get('/mcp', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(405).json({
    error: 'Method Not Allowed',
    message: 'This server uses Streamable HTTP transport. Use POST /mcp for MCP communication.'
  });
});

// ── REST endpoints ────────────────────────────────────────────────────────────

app.get('/search/:query', searchLimiter, async (req, res) => {
  try {
    const query = sanitizeParam(decodeURIComponent(req.params.query));
    if (!query) {
      res.status(400).json({ error: 'Invalid query parameter' });
      return;
    }
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 500);
    const results = await wikipediaClient.search(query, { limit });
    res.json({ query, results, count: results.length, language: wikipediaClient.getLanguage() });
  } catch (error: any) {
    res.status(500).json({ error: error.message, query: req.params.query });
  }
});

app.get('/article/:title', async (req, res) => {
  try {
    const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
    if (!title) { res.status(400).json({ error: 'Invalid title parameter' }); return; }
    const article = await wikipediaClient.getArticle(title);
    res.json(article);
  } catch (error: any) {
    res.status(500).json({ error: error.message, title: req.params.title, exists: false });
  }
});

app.get('/summary/:title', async (req, res) => {
  try {
    const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
    if (!title) { res.status(400).json({ error: 'Invalid title parameter' }); return; }
    const summary = await wikipediaClient.getSummary(title);
    const isError = summary.startsWith('Error:');
    res.json({ title, summary: isError ? null : summary, error: isError ? summary : undefined });
  } catch (error: any) {
    res.status(500).json({ error: error.message, title: req.params.title, summary: null });
  }
});

app.get('/sections/:title', async (req, res) => {
  try {
    const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
    if (!title) { res.status(400).json({ error: 'Invalid title parameter' }); return; }
    const sections = await wikipediaClient.getSections(title);
    res.json({ title, sections });
  } catch (error: any) {
    res.status(500).json({ error: error.message, title: req.params.title, sections: [] });
  }
});

app.get('/links/:title', async (req, res) => {
  try {
    const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
    if (!title) { res.status(400).json({ error: 'Invalid title parameter' }); return; }
    const links = await wikipediaClient.getLinks(title);
    res.json({ title, links });
  } catch (error: any) {
    res.status(500).json({ error: error.message, title: req.params.title, links: [] });
  }
});

app.get('/coordinates/:title', async (req, res) => {
  try {
    const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
    if (!title) { res.status(400).json({ error: 'Invalid title parameter' }); return; }
    const coordinates = await wikipediaClient.getCoordinates(title);
    res.json(coordinates);
  } catch (error: any) {
    res.status(500).json({ error: error.message, title: req.params.title, coordinates: [], exists: false });
  }
});

app.get('/related/:title', async (req, res) => {
  try {
    const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
    if (!title) { res.status(400).json({ error: 'Invalid title parameter' }); return; }
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const relatedTopics = await wikipediaClient.getRelatedTopics(title, limit);
    res.json({ title, related_topics: relatedTopics });
  } catch (error: any) {
    res.status(500).json({ error: error.message, title: req.params.title, related_topics: [] });
  }
});

app.get('/summary/:title/query/:query/length/:maxLength', async (req, res) => {
  try {
    const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
    const query = sanitizeParam(decodeURIComponent(req.params.query));
    if (!title || !query) { res.status(400).json({ error: 'Invalid title or query parameter' }); return; }
    const maxLength = Math.min(parseInt(req.params.maxLength) || 250, 1000);
    const summary = await wikipediaClient.summarizeForQuery(title, query, maxLength);
    res.json({ title, query, summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message, title: req.params.title, query: req.params.query, summary: null });
  }
});

app.get('/summary/:title/section/:section/length/:maxLength', async (req, res) => {
  try {
    const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
    const section = sanitizeParam(decodeURIComponent(req.params.section), 300);
    if (!title || !section) { res.status(400).json({ error: 'Invalid title or section parameter' }); return; }
    const maxLength = Math.min(parseInt(req.params.maxLength) || 150, 500);
    const summary = await wikipediaClient.summarizeSection(title, section, maxLength);
    res.json({ title, section_title: section, summary });
  } catch (error: any) {
    res.status(500).json({ error: error.message, title: req.params.title, section_title: req.params.section, summary: null });
  }
});

app.get('/facts/:title', async (req, res) => {
  try {
    const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
    const topic = req.query.topic ? sanitizeParam(req.query.topic as string) : undefined;
    if (!title) { res.status(400).json({ error: 'Invalid title parameter' }); return; }
    const count = Math.min(parseInt(req.query.count as string) || 5, 20);
    const facts = await wikipediaClient.extractFacts(title, topic, count);
    res.json({ title, topic_within_article: topic || null, facts });
  } catch (error: any) {
    res.status(500).json({ error: error.message, title: req.params.title, facts: [] });
  }
});

app.get('/test-connectivity', async (req, res) => {
  try {
    const diagnostics = await wikipediaClient.testConnectivity();
    if (diagnostics.status === 'success' && typeof diagnostics.response_time_ms === 'number') {
      diagnostics.response_time_ms = Math.round(diagnostics.response_time_ms * 1000) / 1000;
    }
    res.json(diagnostics);
  } catch (error: any) {
    res.status(500).json({ status: 'failed', error: error.message, response_time_ms: 0 });
  }
});

app.get('/supported-countries', async (req, res) => {
  try {
    const countries = WikipediaClient.listSupportedCountries();
    res.json({
      supported_countries: countries,
      usage_examples: [
        'wikipedia-mcp --country US    # English (United States)',
        'wikipedia-mcp --country CN    # Chinese Simplified (China)',
        'wikipedia-mcp --country TW    # Chinese Traditional (Taiwan)',
        'wikipedia-mcp --country Japan # Japanese'
      ]
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/tools/:toolName', mcpLimiter, async (req, res) => {
  try {
    const { toolName } = req.params;
    const result = await mcpHelper.executeTool(toolName, req.body);
    if ((result as any).isError) {
      res.status(500).json(result);
    } else {
      res.json(result);
    }
  } catch (error: any) {
    res.status(500).json({ content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true });
  }
});

// ── Error / 404 handlers ──────────────────────────────────────────────────────

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error', message: error.message });
});

app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      'GET /health',
      'GET /mcp',
      'POST /mcp',
      'POST /messages',
      'GET /search/:query',
      'GET /article/:title',
      'GET /summary/:title',
      'GET /sections/:title',
      'GET /links/:title',
      'GET /coordinates/:title',
      'GET /related/:title',
      'GET /summary/:title/query/:query/length/:maxLength',
      'GET /summary/:title/section/:section/length/:maxLength',
      'GET /facts/:title',
      'GET /test-connectivity',
      'GET /supported-countries',
      'POST /tools/:toolName'
    ]
  });
});

// ── Local dev server ──────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Wikipedia MCP Server running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`MCP endpoint: http://localhost:${port}/mcp`);
  });
}

export default app;

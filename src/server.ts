import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { WikipediaClient } from './wikipedia-client.js';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { MCPServer } from './mcp-server.js';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize Wikipedia client with environment variables
const wikipediaClient = new WikipediaClient({
  language: process.env.WIKIPEDIA_LANGUAGE || 'en',
  country: process.env.WIKIPEDIA_COUNTRY,
  enableCache: process.env.ENABLE_CACHE === 'true',
  accessToken: process.env.WIKIPEDIA_ACCESS_TOKEN
});

// Initialize MCPServer helper (for tool logic reuse)
const mcpHelper = new MCPServer({
  language: process.env.WIKIPEDIA_LANGUAGE || 'en',
  country: process.env.WIKIPEDIA_COUNTRY,
  enableCache: process.env.ENABLE_CACHE === 'true',
  accessToken: process.env.WIKIPEDIA_ACCESS_TOKEN
});

// Initialize SDK McpServer
const mcpServer = new McpServer({
  name: 'wikipedia-mcp-server',
  version: '1.0.0'
});

// Simple in-memory store for session data (for serverless - wont persist between requests but works for single request flow)
// For Vercel, we don't need persistent SSE connections, just direct HTTP transport
const sessionStore = new Map<string, any>();

// Helper to format tool results for SDK
const formatToolResult = (result: any) => ({
  content: result.content.map((item: any) => ({
    type: item.type as "text", // Cast strictly to "text" as most Wikipedia results are text
    text: item.text
  })),
  isError: result.isError ? true : undefined
});

// Register tools with SDK McpServer
mcpServer.tool('search_wikipedia',
  { 
    query: z.string(), 
    limit: z.number().optional(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => {
    const result = await mcpHelper.executeTool('search_wikipedia', args);
    return formatToolResult(result);
  }
);

mcpServer.tool('get_article',
  { 
    title: z.string(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => {
    const result = await mcpHelper.executeTool('get_article', args);
    return formatToolResult(result);
  }
);

mcpServer.tool('get_summary',
  { 
    title: z.string(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => {
    const result = await mcpHelper.executeTool('get_summary', args);
    return formatToolResult(result);
  }
);

mcpServer.tool('get_sections',
  { 
    title: z.string(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => {
    const result = await mcpHelper.executeTool('get_sections', args);
    return formatToolResult(result);
  }
);

mcpServer.tool('get_links',
  { 
    title: z.string(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => {
    const result = await mcpHelper.executeTool('get_links', args);
    return formatToolResult(result);
  }
);

mcpServer.tool('get_coordinates',
  { 
    title: z.string(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => {
    const result = await mcpHelper.executeTool('get_coordinates', args);
    return formatToolResult(result);
  }
);

mcpServer.tool('get_related_topics',
  { 
    title: z.string(), 
    limit: z.number().optional(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => {
    const result = await mcpHelper.executeTool('get_related_topics', args);
    return formatToolResult(result);
  }
);

mcpServer.tool('summarize_article_for_query',
  { 
    title: z.string(), 
    query: z.string(), 
    max_length: z.number().optional(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => {
    const result = await mcpHelper.executeTool('summarize_article_for_query', args);
    return formatToolResult(result);
  }
);

mcpServer.tool('summarize_article_section',
  { 
    title: z.string(), 
    section_title: z.string(), 
    max_length: z.number().optional(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => {
    const result = await mcpHelper.executeTool('summarize_article_section', args);
    return formatToolResult(result);
  }
);

mcpServer.tool('extract_key_facts',
  { 
    title: z.string(), 
    topic_within_article: z.string().optional(), 
    count: z.number().optional(),
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => {
    const result = await mcpHelper.executeTool('extract_key_facts', args);
    return formatToolResult(result);
  }
);

mcpServer.tool('test_wikipedia_connectivity',
  {
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => {
    const result = await mcpHelper.executeTool('test_wikipedia_connectivity', args);
    return formatToolResult(result);
  }
);

mcpServer.tool('list_supported_countries',
  {
    language: z.string().optional(),
    country: z.string().optional()
  },
  async (args) => {
    const result = await mcpHelper.executeTool('list_supported_countries', args);
    return formatToolResult(result);
  }
);

// Simple HTTP POST endpoint for MCP (works with Vercel serverless)
// SSE is not supported on Vercel due to serverless architecture constraints
app.post('/messages', async (req, res) => {
  console.log('MCP messages endpoint called');
  res.status(200).json({ 
    message: "Use POST /mcp for MCP protocol communication. SSE is not supported on Vercel.",
    instruction: "Please connect to https://wikipedia-mcp-zeta.vercel.app/mcp using HTTP transport instead of SSE"
  });
});


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'wikipedia-mcp-server'
  });
});

// MCP HTTP Transport Endpoint (POST for direct MCP communication)
app.post('/mcp', async (req, res) => {
  console.log('MCP HTTP transport request received');
  
  try {
    // Handle MCP JSON-RPC requests directly
    const requestData = req.body;
    
    // Log the incoming request for debugging
    console.log('MCP Request:', JSON.stringify(requestData, null, 2));
    
    // Handle different types of MCP requests
    if (requestData.method === 'initialize') {
      // Return server capabilities
      res.json({
        jsonrpc: '2.0',
        id: requestData.id,
        result: {
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'wikipedia-mcp-server',
            version: '1.0.0'
          }
        }
      });
    } else if (requestData.method === 'tools/list') {
      // List available tools
      res.json({
        jsonrpc: '2.0',
        id: requestData.id,
        result: {
          tools: mcpHelper.getServerInfo().tools
        }
      });
    } else if (requestData.method === 'tools/call') {
      // Execute a tool
      const { name, arguments: args } = requestData.params;
      
      // Use the existing tool logic
      const result = await mcpHelper.executeTool(name, args);
      
      res.json({
        jsonrpc: '2.0',
        id: requestData.id,
        result: formatToolResult(result)
      });
    } else {
      // Handle other MCP methods or return error
      res.status(400).json({
        jsonrpc: '2.0',
        id: requestData.id,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      });
    }
  } catch (error) {
    console.error('Error handling MCP request:', error);
    res.status(500).json({
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

// MCP Server Info endpoint (Legacy/Information)
app.get('/mcp', (req, res) => {
  // Return the manual server info
  res.json(mcpHelper.getServerInfo());
});

// HTTP Resources (RESTful endpoints)

// Search Wikipedia
app.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;
    
    const results = await wikipediaClient.search(query, { 
      limit: parseInt(limit as string) || 10 
    });
    
    res.json({
      query,
      results,
      count: results.length,
      language: wikipediaClient.getLanguage()
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      query: req.params.query
    });
  }
});

// Get article
app.get('/article/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const article = await wikipediaClient.getArticle(title);
    res.json(article);
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      title: req.params.title,
      exists: false
    });
  }
});

// Get summary
app.get('/summary/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const summary = await wikipediaClient.getSummary(title);
    const isError = summary.startsWith('Error:');
    
    res.json({
      title,
      summary: isError ? null : summary,
      error: isError ? summary : undefined
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      title: req.params.title,
      summary: null
    });
  }
});

// Get sections
app.get('/sections/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const sections = await wikipediaClient.getSections(title);
    res.json({ title, sections });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      title: req.params.title,
      sections: []
    });
  }
});

// Get links
app.get('/links/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const links = await wikipediaClient.getLinks(title);
    res.json({ title, links });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      title: req.params.title,
      links: []
    });
  }
});

// Get coordinates
app.get('/coordinates/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const coordinates = await wikipediaClient.getCoordinates(title);
    res.json(coordinates);
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      title: req.params.title,
      coordinates: [],
      exists: false
    });
  }
});

// Get related topics
app.get('/related/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const { limit = 10 } = req.query;
    
    const relatedTopics = await wikipediaClient.getRelatedTopics(
      title, 
      parseInt(limit as string) || 10
    );
    
    res.json({ title, related_topics: relatedTopics });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      title: req.params.title,
      related_topics: []
    });
  }
});

// Query-focused summary
app.get('/summary/:title/query/:query/length/:maxLength', async (req, res) => {
  try {
    const { title, query } = req.params;
    const { maxLength = 250 } = req.query;
    
    const summary = await wikipediaClient.summarizeForQuery(
      title, 
      query, 
      parseInt(maxLength as string) || 250
    );
    
    res.json({
      title,
      query,
      summary
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      title: req.params.title,
      query: req.params.query,
      summary: null
    });
  }
});

// Section summary
app.get('/summary/:title/section/:section/length/:maxLength', async (req, res) => {
  try {
    const { title, section } = req.params;
    const { maxLength = 150 } = req.query;
    
    const summary = await wikipediaClient.summarizeSection(
      title, 
      section, 
      parseInt(maxLength as string) || 150
    );
    
    res.json({
      title,
      section_title: section,
      summary
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      title: req.params.title,
      section_title: req.params.section,
      summary: null
    });
  }
});

// Extract key facts
app.get('/facts/:title', async (req, res) => {
  try {
    const { title } = req.params;
    const { topic, count = 5 } = req.query;
    
    const facts = await wikipediaClient.extractFacts(
      title, 
      topic as string, 
      parseInt(count as string) || 5
    );
    
    res.json({
      title,
      topic_within_article: topic || null,
      facts
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      title: req.params.title,
      facts: []
    });
  }
});

// Test connectivity
app.get('/test-connectivity', async (req, res) => {
  try {
    const diagnostics = await wikipediaClient.testConnectivity();
    
    // Round response_time_ms for nicer output
    if (diagnostics.status === 'success' && typeof diagnostics.response_time_ms === 'number') {
      diagnostics.response_time_ms = Math.round(diagnostics.response_time_ms * 1000) / 1000;
    }
    
    res.json(diagnostics);
  } catch (error: any) {
    res.status(500).json({
      status: 'failed',
      error: error.message,
      response_time_ms: 0
    });
  }
});

// List supported countries
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
    res.status(500).json({
      error: error.message
    });
  }
});

// MCP Tool execution endpoint (REST wrapper)
app.post('/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const args = req.body;
    
    // Use mcpHelper to execute
    const result = await mcpHelper.executeTool(toolName, args);
    
    // Check isError safely (using any cast if needed, but the object should be fine in runtime)
    if ((result as any).isError) {
      res.status(500).json(result);
    } else {
      res.json(result);
    }
  } catch (error: any) {
    res.status(500).json({
      content: [{ type: 'text', text: `Error: ${error.message}` }],
      isError: true
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method,
    available_endpoints: [
      'GET /health',
      'GET /sse',
      'POST /messages',
      'GET /mcp',
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

// Start server
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Wikipedia MCP Server running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
    console.log(`MCP info: http://localhost:${port}/mcp`);
    console.log(`SSE Endpoint: http://localhost:${port}/sse`);
  });
}

export default app;

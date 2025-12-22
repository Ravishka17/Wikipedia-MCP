import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { WikipediaClient } from './wikipedia-client.js';

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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'wikipedia-mcp-server'
  });
});

// MCP Server Info endpoint
app.get('/mcp', (req, res) => {
  res.json({
    name: 'wikipedia-mcp-server',
    version: '1.0.0',
    description: 'Wikipedia MCP Server for Vercel deployment',
    protocolVersion: '2024-11-05',
    tools: [
      {
        name: 'search_wikipedia',
        description: 'Search Wikipedia for articles matching a query',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' },
            limit: { type: 'number', default: 10, minimum: 1, maximum: 500 }
          },
          required: ['query']
        }
      },
      {
        name: 'get_article',
        description: 'Get the full content of a Wikipedia article',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' }
          },
          required: ['title']
        }
      },
      {
        name: 'get_summary',
        description: 'Get a summary of a Wikipedia article',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' }
          },
          required: ['title']
        }
      },
      {
        name: 'get_sections',
        description: 'Get the sections of a Wikipedia article',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' }
          },
          required: ['title']
        }
      },
      {
        name: 'get_links',
        description: 'Get the links contained within a Wikipedia article',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' }
          },
          required: ['title']
        }
      },
      {
        name: 'get_coordinates',
        description: 'Get the coordinates of a Wikipedia article',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' }
          },
          required: ['title']
        }
      },
      {
        name: 'get_related_topics',
        description: 'Get topics related to a Wikipedia article',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            limit: { type: 'number', default: 10, minimum: 1, maximum: 50 }
          },
          required: ['title']
        }
      },
      {
        name: 'summarize_article_for_query',
        description: 'Get a summary of a Wikipedia article tailored to a specific query',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            query: { type: 'string' },
            max_length: { type: 'number', default: 250, minimum: 50, maximum: 1000 }
          },
          required: ['title', 'query']
        }
      },
      {
        name: 'summarize_article_section',
        description: 'Get a summary of a specific section of a Wikipedia article',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            section_title: { type: 'string' },
            max_length: { type: 'number', default: 150, minimum: 50, maximum: 500 }
          },
          required: ['title', 'section_title']
        }
      },
      {
        name: 'extract_key_facts',
        description: 'Extract key facts from a Wikipedia article',
        inputSchema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            topic_within_article: { type: 'string' },
            count: { type: 'number', default: 5, minimum: 1, maximum: 20 }
          },
          required: ['title']
        }
      },
      {
        name: 'test_wikipedia_connectivity',
        description: 'Provide diagnostics for Wikipedia API connectivity',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'list_supported_countries',
        description: 'List all supported country/locale codes',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      }
    ]
  });
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

// MCP Tool execution endpoint
app.post('/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const args = req.body;

    switch (toolName) {
      case 'search_wikipedia':
        return await handleToolExecution(res, args, async () => {
          const { query, limit = 10 } = args;
          const results = await wikipediaClient.search(query, { limit });
          return {
            query,
            results,
            status: results.length > 0 ? 'success' : 'no_results',
            count: results.length,
            language: wikipediaClient.getLanguage()
          };
        });

      case 'get_article':
        return await handleToolExecution(res, args, async () => {
          const { title } = args;
          return await wikipediaClient.getArticle(title);
        });

      case 'get_summary':
        return await handleToolExecution(res, args, async () => {
          const { title } = args;
          const summary = await wikipediaClient.getSummary(title);
          const isError = summary.startsWith('Error:');
          return {
            title,
            summary: isError ? null : summary,
            error: isError ? summary : undefined
          };
        });

      case 'get_sections':
        return await handleToolExecution(res, args, async () => {
          const { title } = args;
          const sections = await wikipediaClient.getSections(title);
          return { title, sections };
        });

      case 'get_links':
        return await handleToolExecution(res, args, async () => {
          const { title } = args;
          const links = await wikipediaClient.getLinks(title);
          return { title, links };
        });

      case 'get_coordinates':
        return await handleToolExecution(res, args, async () => {
          const { title } = args;
          return await wikipediaClient.getCoordinates(title);
        });

      case 'get_related_topics':
        return await handleToolExecution(res, args, async () => {
          const { title, limit = 10 } = args;
          const relatedTopics = await wikipediaClient.getRelatedTopics(title, limit);
          return { title, related_topics: relatedTopics };
        });

      case 'summarize_article_for_query':
        return await handleToolExecution(res, args, async () => {
          const { title, query, max_length = 250 } = args;
          const summary = await wikipediaClient.summarizeForQuery(title, query, max_length);
          return { title, query, summary };
        });

      case 'summarize_article_section':
        return await handleToolExecution(res, args, async () => {
          const { title, section_title, max_length = 150 } = args;
          const summary = await wikipediaClient.summarizeSection(title, section_title, max_length);
          return { title, section_title, summary };
        });

      case 'extract_key_facts':
        return await handleToolExecution(res, args, async () => {
          const { title, topic_within_article, count = 5 } = args;
          const facts = await wikipediaClient.extractFacts(title, topic_within_article, count);
          return {
            title,
            topic_within_article: topic_within_article || null,
            facts
          };
        });

      case 'test_wikipedia_connectivity':
        return await handleToolExecution(res, args, async () => {
          const diagnostics = await wikipediaClient.testConnectivity();
          if (diagnostics.status === 'success' && typeof diagnostics.response_time_ms === 'number') {
            diagnostics.response_time_ms = Math.round(diagnostics.response_time_ms * 1000) / 1000;
          }
          return diagnostics;
        });

      case 'list_supported_countries':
        return await handleToolExecution(res, args, async () => {
          const countries = WikipediaClient.listSupportedCountries();
          return {
            supported_countries: countries,
            usage_examples: [
              'wikipedia-mcp --country US    # English (United States)',
              'wikipedia-mcp --country CN    # Chinese Simplified (China)',
              'wikipedia-mcp --country TW    # Chinese Traditional (Taiwan)',
              'wikipedia-mcp --country Japan # Japanese'
            ]
          };
        });

      default:
        res.status(404).json({
          error: `Unknown tool: ${toolName}`,
          available_tools: [
            'search_wikipedia', 'get_article', 'get_summary', 'get_sections',
            'get_links', 'get_coordinates', 'get_related_topics',
            'summarize_article_for_query', 'summarize_article_section',
            'extract_key_facts', 'test_wikipedia_connectivity', 'list_supported_countries'
          ]
        });
    }
  } catch (error: any) {
    res.status(500).json({
      error: `Tool execution failed: ${error.message}`,
      tool: req.params.toolName,
      isError: true
    });
  }
});

// Helper function for tool execution
async function handleToolExecution(res: any, args: any, fn: () => Promise<any>) {
  try {
    const result = await fn();
    res.json({
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    });
  } catch (error: any) {
    res.status(500).json({
      content: [
        {
          type: 'text',
          text: `Error executing tool: ${error.message}`
        }
      ],
      isError: true
    });
  }
}

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
  });
}

export default app;

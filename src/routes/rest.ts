import { Application } from 'express';
import { WikipediaClient } from '../wikipedia-client.js';
import { MCPServer } from '../mcp-server.js';
import { searchLimiter, mcpLimiter } from '../middleware.js';
import { sanitizeInput } from '../sanitize.js';

// sanitizeInput doubles as sanitizeParam for the REST layer —
// same logic, just imported under a more route-appropriate alias.
const sanitizeParam = (value: unknown, maxLength = 500) =>
  sanitizeInput(value, maxLength);

export function registerRestRoutes(
  app: Application,
  wikipediaClient: WikipediaClient,
  mcpHelper: MCPServer
): void {

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'wikipedia-mcp-server'
    });
  });

  // ── Wikipedia REST endpoints ──────────────────────────────────────────────

  // Search Wikipedia
  app.get('/search/:query', searchLimiter, async (req, res) => {
    try {
      const query = sanitizeParam(decodeURIComponent(req.params.query));
      if (!query) {
        res.status(400).json({ error: 'Invalid query parameter', query: req.params.query });
        return;
      }
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 500);
      const results = await wikipediaClient.search(query, { limit });
      res.json({ query, results, count: results.length, language: wikipediaClient.getLanguage() });
    } catch (error: any) {
      res.status(500).json({ error: error.message, query: req.params.query });
    }
  });

  // Get article
  app.get('/article/:title', async (req, res) => {
    try {
      const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
      if (!title) {
        res.status(400).json({ error: 'Invalid title parameter', title: req.params.title, exists: false });
        return;
      }
      const article = await wikipediaClient.getArticle(title);
      res.json(article);
    } catch (error: any) {
      res.status(500).json({ error: error.message, title: req.params.title, exists: false });
    }
  });

  // Get summary
  app.get('/summary/:title', async (req, res) => {
    try {
      const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
      if (!title) {
        res.status(400).json({ error: 'Invalid title parameter', title: req.params.title, summary: null });
        return;
      }
      const summary = await wikipediaClient.getSummary(title);
      const isError = summary.startsWith('Error:');
      res.json({ title, summary: isError ? null : summary, error: isError ? summary : undefined });
    } catch (error: any) {
      res.status(500).json({ error: error.message, title: req.params.title, summary: null });
    }
  });

  // Get sections
  app.get('/sections/:title', async (req, res) => {
    try {
      const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
      if (!title) {
        res.status(400).json({ error: 'Invalid title parameter', title: req.params.title, sections: [] });
        return;
      }
      const sections = await wikipediaClient.getSections(title);
      res.json({ title, sections });
    } catch (error: any) {
      res.status(500).json({ error: error.message, title: req.params.title, sections: [] });
    }
  });

  // Get links
  app.get('/links/:title', async (req, res) => {
    try {
      const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
      if (!title) {
        res.status(400).json({ error: 'Invalid title parameter', title: req.params.title, links: [] });
        return;
      }
      const links = await wikipediaClient.getLinks(title);
      res.json({ title, links });
    } catch (error: any) {
      res.status(500).json({ error: error.message, title: req.params.title, links: [] });
    }
  });

  // Get coordinates
  app.get('/coordinates/:title', async (req, res) => {
    try {
      const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
      if (!title) {
        res.status(400).json({ error: 'Invalid title parameter', title: req.params.title, coordinates: [], exists: false });
        return;
      }
      const coordinates = await wikipediaClient.getCoordinates(title);
      res.json(coordinates);
    } catch (error: any) {
      res.status(500).json({ error: error.message, title: req.params.title, coordinates: [], exists: false });
    }
  });

  // Get related topics
  app.get('/related/:title', async (req, res) => {
    try {
      const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
      if (!title) {
        res.status(400).json({ error: 'Invalid title parameter', title: req.params.title, related_topics: [] });
        return;
      }
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const relatedTopics = await wikipediaClient.getRelatedTopics(title, limit);
      res.json({ title, related_topics: relatedTopics });
    } catch (error: any) {
      res.status(500).json({ error: error.message, title: req.params.title, related_topics: [] });
    }
  });

  // Query-focused summary
  app.get('/summary/:title/query/:query/length/:maxLength', async (req, res) => {
    try {
      const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
      const query = sanitizeParam(decodeURIComponent(req.params.query));
      if (!title || !query) {
        res.status(400).json({ error: 'Invalid title or query parameter', title: req.params.title, query: req.params.query, summary: null });
        return;
      }
      const maxLength = Math.min(parseInt(req.params.maxLength) || 250, 1000);
      const summary = await wikipediaClient.summarizeForQuery(title, query, maxLength);
      res.json({ title, query, summary });
    } catch (error: any) {
      res.status(500).json({ error: error.message, title: req.params.title, query: req.params.query, summary: null });
    }
  });

  // Section summary
  app.get('/summary/:title/section/:section/length/:maxLength', async (req, res) => {
    try {
      const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
      const section = sanitizeParam(decodeURIComponent(req.params.section), 300);
      if (!title || !section) {
        res.status(400).json({ error: 'Invalid title or section parameter', title: req.params.title, section_title: req.params.section, summary: null });
        return;
      }
      const maxLength = Math.min(parseInt(req.params.maxLength) || 150, 500);
      const summary = await wikipediaClient.summarizeSection(title, section, maxLength);
      res.json({ title, section_title: section, summary });
    } catch (error: any) {
      res.status(500).json({ error: error.message, title: req.params.title, section_title: req.params.section, summary: null });
    }
  });

  // Extract key facts
  app.get('/facts/:title', async (req, res) => {
    try {
      const title = sanitizeParam(decodeURIComponent(req.params.title), 300);
      const topic = req.query.topic ? sanitizeParam(req.query.topic as string) : undefined;
      if (!title) {
        res.status(400).json({ error: 'Invalid title parameter', title: req.params.title, facts: [] });
        return;
      }
      const count = Math.min(parseInt(req.query.count as string) || 5, 20);
      const facts = await wikipediaClient.extractFacts(title, topic, count);
      res.json({ title, topic_within_article: topic || null, facts });
    } catch (error: any) {
      res.status(500).json({ error: error.message, title: req.params.title, facts: [] });
    }
  });

  // Test connectivity
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
      res.status(500).json({ error: error.message });
    }
  });

  // MCP Tool execution endpoint (REST wrapper)
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
}

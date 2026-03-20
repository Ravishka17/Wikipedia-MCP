import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { MCPServer } from './mcp-server.js';
import { formatToolResult } from './utils.js';

export function registerTools(mcpServer: McpServer, mcpHelper: MCPServer): void {
  mcpServer.tool('search_wikipedia',
    {
      query: z.string().max(500),
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
      title: z.string().max(300),
      full: z.boolean().optional(),
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
      title: z.string().max(300),
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
      title: z.string().max(300),
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
      title: z.string().max(300),
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
      title: z.string().max(300),
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
      title: z.string().max(300),
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
      title: z.string().max(300),
      query: z.string().max(500),
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
      title: z.string().max(300),
      section_title: z.string().max(300),
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
      title: z.string().max(300),
      topic_within_article: z.string().max(300).optional(),
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

  mcpServer.tool('multi_search_wikipedia',
    {
      searches: z.array(z.object({
        query: z.string().max(500),
        language: z.string().optional(),
        country: z.string().optional(),
        limit: z.number().optional()
      })).min(1).max(20)
    },
    async (args) => {
      const result = await mcpHelper.executeTool('multi_search_wikipedia', args);
      return formatToolResult(result);
    }
  );
}

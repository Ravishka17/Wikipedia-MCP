import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { WikipediaClient } from './wikipedia-client.js';
import type { 
  SearchResult, 
  WikipediaArticle, 
  ArticleSection, 
  RelatedTopic 
} from './types.js';

export class MCPServer {
  private server: Server;
  private wikipediaClient: WikipediaClient;

  constructor(options: {
    language?: string;
    country?: string;
    enableCache?: boolean;
    accessToken?: string;
  } = {}) {
    this.wikipediaClient = new WikipediaClient(options);

    this.server = new Server(
      {
        name: 'wikipedia-mcp-server',
        version: '1.0.0',
        description: 'Wikipedia MCP Server for AI assistants',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
  }

  private setupTools() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_wikipedia',
          description: 'Search Wikipedia for articles matching a query',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search term to look up on Wikipedia'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return (1-500)',
                default: 10,
                minimum: 1,
                maximum: 500
              }
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
              title: {
                type: 'string',
                description: 'The title of the Wikipedia article'
              }
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
              title: {
                type: 'string',
                description: 'The title of the Wikipedia article'
              }
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
              title: {
                type: 'string',
                description: 'The title of the Wikipedia article'
              }
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
              title: {
                type: 'string',
                description: 'The title of the Wikipedia article'
              }
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
              title: {
                type: 'string',
                description: 'The title of the Wikipedia article'
              }
            },
            required: ['title']
          }
        },
        {
          name: 'get_related_topics',
          description: 'Get topics related to a Wikipedia article based on links and categories',
          inputSchema: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'The title of the Wikipedia article'
              },
              limit: {
                type: 'number',
                description: 'Maximum number of related topics',
                default: 10,
                minimum: 1,
                maximum: 50
              }
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
              title: {
                type: 'string',
                description: 'The title of the Wikipedia article'
              },
              query: {
                type: 'string',
                description: 'The query to focus the summary on'
              },
              max_length: {
                type: 'number',
                description: 'Maximum length of the summary',
                default: 250,
                minimum: 50,
                maximum: 1000
              }
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
              title: {
                type: 'string',
                description: 'The title of the Wikipedia article'
              },
              section_title: {
                type: 'string',
                description: 'The title of the section to summarize'
              },
              max_length: {
                type: 'number',
                description: 'Maximum length of the summary',
                default: 150,
                minimum: 50,
                maximum: 500
              }
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
              title: {
                type: 'string',
                description: 'The title of the Wikipedia article'
              },
              topic_within_article: {
                type: 'string',
                description: 'A specific topic within the article to focus fact extraction'
              },
              count: {
                type: 'number',
                description: 'Number of key facts to extract',
                default: 5,
                minimum: 1,
                maximum: 20
              }
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
    }));

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'search_wikipedia':
            return await this.handleSearchWikipedia(args);
          case 'get_article':
            return await this.handleGetArticle(args);
          case 'get_summary':
            return await this.handleGetSummary(args);
          case 'get_sections':
            return await this.handleGetSections(args);
          case 'get_links':
            return await this.handleGetLinks(args);
          case 'get_coordinates':
            return await this.handleGetCoordinates(args);
          case 'get_related_topics':
            return await this.handleGetRelatedTopics(args);
          case 'summarize_article_for_query':
            return await this.handleSummarizeForQuery(args);
          case 'summarize_article_section':
            return await this.handleSummarizeSection(args);
          case 'extract_key_facts':
            return await this.handleExtractFacts(args);
          case 'test_wikipedia_connectivity':
            return await this.handleTestConnectivity(args);
          case 'list_supported_countries':
            return await this.handleListCountries(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing tool ${request.params.name}: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private async handleSearchWikipedia(args: any) {
    const { query, limit = 10 } = args;

    if (!query || !query.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              query: query,
              results: [],
              status: 'error',
              message: 'Empty search query provided'
            }, null, 2)
          }
        ]
      };
    }

    const validatedLimit = Math.min(Math.max(limit, 1), 500);
    const results = await this.wikipediaClient.search(query, { limit: validatedLimit });
    const status = results.length > 0 ? 'success' : 'no_results';

    const response = {
      query: query,
      results: results,
      status: status,
      count: results.length,
      language: this.wikipediaClient.getLanguage()
    };

    if (!results.length) {
      response.message = 'No search results found. This could indicate connectivity issues, API errors, or simply no matching articles.';
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2)
        }
      ]
    };
  }

  private async handleGetArticle(args: any) {
    const { title } = args;

    if (!title || !title.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: title,
              exists: false,
              error: 'Invalid title provided'
            }, null, 2)
          }
        ]
      };
    }

    const article = await this.wikipediaClient.getArticle(title);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(article, null, 2)
        }
      ]
    };
  }

  private async handleGetSummary(args: any) {
    const { title } = args;

    if (!title || !title.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: title,
              summary: null,
              error: 'Invalid title provided'
            }, null, 2)
          }
        ]
      };
    }

    const summary = await this.wikipediaClient.getSummary(title);
    const isError = summary.startsWith('Error:');

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: title,
            summary: isError ? null : summary,
            error: isError ? summary : undefined
          }, null, 2)
        }
      ]
    };
  }

  private async handleGetSections(args: any) {
    const { title } = args;

    if (!title || !title.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: title,
              sections: [],
              error: 'Invalid title provided'
            }, null, 2)
          }
        ]
      };
    }

    const sections = await this.wikipediaClient.getSections(title);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: title,
            sections: sections
          }, null, 2)
        }
      ]
    };
  }

  private async handleGetLinks(args: any) {
    const { title } = args;

    if (!title || !title.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: title,
              links: [],
              error: 'Invalid title provided'
            }, null, 2)
          }
        ]
      };
    }

    const links = await this.wikipediaClient.getLinks(title);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: title,
            links: links
          }, null, 2)
        }
      ]
    };
  }

  private async handleGetCoordinates(args: any) {
    const { title } = args;

    if (!title || !title.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: title,
              pageid: 0,
              coordinates: [],
              exists: false,
              error: 'Invalid title provided'
            }, null, 2)
          }
        ]
      };
    }

    const coordinates = await this.wikipediaClient.getCoordinates(title);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(coordinates, null, 2)
        }
      ]
    };
  }

  private async handleGetRelatedTopics(args: any) {
    const { title, limit = 10 } = args;

    if (!title || !title.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: title,
              related_topics: [],
              error: 'Invalid title provided'
            }, null, 2)
          }
        ]
      };
    }

    const relatedTopics = await this.wikipediaClient.getRelatedTopics(title, limit);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: title,
            related_topics: relatedTopics
          }, null, 2)
        }
      ]
    };
  }

  private async handleSummarizeForQuery(args: any) {
    const { title, query, max_length = 250 } = args;

    if (!title || !title.trim() || !query || !query.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: title,
              query: query,
              summary: null,
              error: 'Invalid title or query provided'
            }, null, 2)
          }
        ]
      };
    }

    const summary = await this.wikipediaClient.summarizeForQuery(title, query, max_length);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: title,
            query: query,
            summary: summary
          }, null, 2)
        }
      ]
    };
  }

  private async handleSummarizeSection(args: any) {
    const { title, section_title, max_length = 150 } = args;

    if (!title || !title.trim() || !section_title || !section_title.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: title,
              section_title: section_title,
              summary: null,
              error: 'Invalid title or section title provided'
            }, null, 2)
          }
        ]
      };
    }

    const summary = await this.wikipediaClient.summarizeSection(title, section_title, max_length);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: title,
            section_title: section_title,
            summary: summary
          }, null, 2)
        }
      ]
    };
  }

  private async handleExtractFacts(args: any) {
    const { title, topic_within_article, count = 5 } = args;

    if (!title || !title.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: title,
              topic_within_article: topic_within_article,
              facts: [],
              error: 'Invalid title provided'
            }, null, 2)
          }
        ]
      };
    }

    const facts = await this.wikipediaClient.extractFacts(title, topic_within_article, count);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: title,
            topic_within_article: topic_within_article || null,
            facts: facts
          }, null, 2)
        }
      ]
    };
  }

  private async handleTestConnectivity(args: any) {
    const diagnostics = await this.wikipediaClient.testConnectivity();

    // Round response_time_ms for nicer output if present
    if (diagnostics.status === 'success' && typeof diagnostics.response_time_ms === 'number') {
      diagnostics.response_time_ms = Math.round(diagnostics.response_time_ms * 1000) / 1000;
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(diagnostics, null, 2)
        }
      ]
    };
  }

  private async handleListCountries(args: any) {
    const countries = WikipediaClient.listSupportedCountries();

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            supported_countries: countries,
            usage_examples: [
              'wikipedia-mcp --country US    # English (United States)',
              'wikipedia-mcp --country CN    # Chinese Simplified (China)',
              'wikipedia-mcp --country TW    # Chinese Traditional (Taiwan)',
              'wikipedia-mcp --country Japan # Japanese'
            ]
          }, null, 2)
        }
      ]
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Wikipedia MCP Server started');
  }
}

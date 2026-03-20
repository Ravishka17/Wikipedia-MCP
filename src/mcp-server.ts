import { WikipediaClient } from './wikipedia-client.js';
import type { 
  SearchResult, 
  WikipediaArticle, 
  ArticleSection, 
  RelatedTopic 
} from './types.js';

export class MCPServer {
  private wikipediaClient: WikipediaClient;
  private serverName: string;
  private version: string;
  private botUsername?: string;
  private botPassword?: string;

  constructor(options: {
    language?: string;
    country?: string;
    enableCache?: boolean;
    botUsername?: string;
    botPassword?: string;
  } = {}) {
    this.wikipediaClient = new WikipediaClient(options);
    this.botUsername = options.botUsername;
    this.botPassword = options.botPassword;
    this.serverName = 'wikipedia-mcp-server';
    this.version = '1.0.0';
  }

  // Get server information for MCP protocol
  getServerInfo() {
    return {
      name: this.serverName,
      version: this.version,
      description: 'Wikipedia MCP Server for AI assistants',
      protocolVersion: '2024-11-05',
      tools: this.getToolsList()
    };
  }

  private getClient(args: any): WikipediaClient {
    if (args.language || args.country) {
      // Create new client if language/country override is specified
      // Bot credentials are passed through so authenticated requests still work
      return new WikipediaClient({
        language: args.language || this.wikipediaClient.getLanguage(),
        country: args.country,
        enableCache: false,
        botUsername: this.botUsername,
        botPassword: this.botPassword,
      });
    }
    return this.wikipediaClient;
  }

  // ── Prompt templates ────────────────────────────────────────────────────

  getPromptsList() {
    return [
      {
        name: 'search_in_native_language',
        description: 'Guides the assistant on how to search Wikipedia correctly when a non-English language or country code is used. The server handles language resolution automatically — always write queries in English using short Wikipedia-style title phrases.',
        arguments: [
          {
            name: 'language',
            description: 'The Wikipedia language code being used (e.g. "si", "ja", "ar")',
            required: true
          },
          {
            name: 'topic',
            description: 'The topic the user wants to search for',
            required: true
          }
        ]
      },
      {
        name: 'wikipedia_usage_guide',
        description: 'A full guide on how to use the Wikipedia MCP tools effectively, including query format, language handling, and tool selection.',
        arguments: []
      },
      {
        name: 'multilingual_research',
        description: 'Guides the assistant through researching a topic across multiple Wikipedia language editions.',
        arguments: [
          {
            name: 'topic',
            description: 'The topic to research across languages',
            required: true
          }
        ]
      }
    ];
  }

  getPrompt(name: string, args: Record<string, string> = {}) {
    switch (name) {

      case 'search_in_native_language': {
        const language = args.language || 'the target language';
        const topic = args.topic || 'the requested topic';
        return {
          description: 'Instructions for searching Wikipedia correctly with a non-English language code',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are about to search Wikipedia for "${topic}" using language code "${language}".

The server automatically resolves English queries to the correct article in the target language — you do NOT need to translate the query yourself.

CRITICAL — query format rules:

1. Always write the query in English as a short Wikipedia article title phrase.
2. Do NOT write full questions or sentences.
3. Do NOT include the word "current", "new", "latest", "recent", "today's", "former", or any other temporal word. Wikipedia article titles never contain these words — they describe the role itself, not who holds it right now.
4. Do NOT include question words like "who is", "what is", "where is".

For political roles, the correct pattern is simply: "[Role] of [Country]"
- ✅ "President of Sri Lanka"  ← correct
- ✅ "Prime Minister of Japan"  ← correct
- ❌ "Current President of Sri Lanka"  ← wrong, "current" breaks the search
- ❌ "Who is the current president of Sri Lanka?"  ← wrong, full question

For general topics, just use the topic name as it would appear as a Wikipedia article title:
- ✅ "Mount Everest", "Eiffel Tower", "World War II", "Sri Lanka"
- ❌ "Tell me about Mount Everest", "Latest news about Sri Lanka"

For researching a topic across multiple languages at once, use multi_search_wikipedia instead of calling search_wikipedia multiple times.

Now search for "${topic}" using the correct short title format — no temporal words, no question words, English only.`
              }
            }
          ]
        };
      }

      case 'wikipedia_usage_guide': {
        return {
          description: 'Full guide for using Wikipedia MCP tools',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `# Wikipedia MCP Usage Guide

## Available Tools
- **search_wikipedia** — Search for articles by keyword in a single language
- **multi_search_wikipedia** — Search multiple queries across multiple languages in one parallel call. Use this instead of calling search_wikipedia repeatedly.
- **get_article** — Retrieve article text. Pass \`full: true\` to get the complete uncompressed wikitext of the entire article. Without it, returns a plain text extract.
- **get_summary** — Get only the introductory summary of an article
- **get_sections** — List the sections of an article
- **get_links** — Get all internal links within an article
- **get_coordinates** — Get geographic coordinates for place articles
- **get_related_topics** — Find related articles based on links
- **summarize_article_for_query** — Get a summary focused on a specific question
- **summarize_article_section** — Summarize a specific section
- **extract_key_facts** — Extract bullet-point facts from an article
- **test_wikipedia_connectivity** — Check if the API is reachable and whether you are authenticated
- **list_supported_countries** — See all supported language editions and country codes

## Language Selection
Every tool accepts optional \`language\` and \`country\` parameters:
- \`language\`: a Wikipedia language code, e.g. "en", "si", "ja", "ar", "zh", "fr"
- \`country\`: an ISO country code, e.g. "US", "LK", "JP" — automatically mapped to the right language

The server automatically resolves English queries to the correct article in the target language. Always write queries in English regardless of the target language.

## Query Format — Most Important Rule
Always use short Wikipedia article title phrases. Never use full questions, sentences, or temporal words.

Wikipedia article titles describe a role or topic permanently — they never say "current", "new", "latest", or "today's". Strip those words before forming the query.

For political roles use: "[Role] of [Country]"
- ✅ "President of Sri Lanka"
- ✅ "Prime Minister of United Kingdom"
- ✅ "Chancellor of Germany"
- ❌ "Current President of Sri Lanka" — never include "current"
- ❌ "Who is the current president of Sri Lanka?"

For general topics:
- ✅ "Mount Everest", "Eiffel Tower", "World War II", "Sri Lanka"
- ❌ "Tell me about Mount Everest", "Latest news about Sri Lanka"

## When to use multi_search_wikipedia
Use multi_search_wikipedia instead of calling search_wikipedia multiple times when you need to:
- Search the same topic across multiple languages at once
- Search several different topics in one call
- Research a subject across multiple Wikipedia language editions efficiently

Each search in the array can have its own query, language, country, and limit.

Example — searching "President of Sri Lanka" in English, Sinhala, and Tamil simultaneously:
\`\`\`
multi_search_wikipedia({
  searches: [
    { query: "President of Sri Lanka", language: "en", limit: 3 },
    { query: "President of Sri Lanka", country: "LK", limit: 3 },
    { query: "President of Sri Lanka", language: "ta", limit: 3 }
  ]
})
\`\`\`

## When to use get_article with full: true
By default, get_article returns a plain text extract which may not include every section. Pass \`full: true\` when you need:
- The complete article with every section and subsection
- Raw wikitext including tables, infoboxes, and references
- Deep research where a partial extract is not sufficient

## Recommended Workflow
1. Use **search_wikipedia** (or **multi_search_wikipedia** for multiple languages) to find the right article title
2. Use **get_summary** for a quick overview
3. Use **get_sections** to understand the article structure
4. Use **summarize_article_for_query** or **summarize_article_section** for targeted information
5. Use **extract_key_facts** for a concise bullet list
6. Use **get_article** (with \`full: true\` if needed) when you need the full text

## Tips
- Article titles returned in search results are the exact titles to use in subsequent tool calls
- For geographic topics, **get_coordinates** returns lat/lon
- **get_related_topics** is useful for discovering context around a subject
- The "simple" language code gives access to Simple English Wikipedia`
              }
            }
          ]
        };
      }

      case 'multilingual_research': {
        const topic = args.topic || 'the requested topic';
        return {
          description: 'Guide for researching a topic across multiple Wikipedia language editions',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `Research "${topic}" across multiple Wikipedia language editions for a comprehensive view.

## Why use multiple languages?
Different Wikipedia editions often contain:
- Local perspectives and region-specific detail not in English Wikipedia
- More detailed coverage of topics important to that culture
- Different sources and citations from local scholarship

## Query format reminder
Always use short Wikipedia title phrases in English — no temporal words, no question words.
- ✅ "President of Sri Lanka" with country: "LK"
- ❌ "Current President of Sri Lanka" with country: "LK"
- ❌ "Who is the current president of Sri Lanka?" with country: "LK"

The server resolves English queries to the correct article in each target language automatically.

## Use multi_search_wikipedia for efficiency
Instead of calling search_wikipedia once per language, use a single multi_search_wikipedia call to run all searches in parallel. Each search can specify its own limit.

\`\`\`
multi_search_wikipedia({
  searches: [
    { query: "${topic}", language: "en", limit: 5 },
    { query: "${topic}", language: "si", limit: 3 },
    { query: "${topic}", language: "ta", limit: 3 },
    { query: "${topic}", language: "ja", limit: 3 }
  ]
})
\`\`\`

## Suggested approach

**Step 1 — Multi-search across target languages**
Use multi_search_wikipedia with the same English query across all relevant language editions in one call.

**Step 2 — Identify relevant language editions**
Consider which languages would have strong coverage:
- Topics about a specific country → use that country's code (e.g. country: "LK" for Sri Lanka)
- Scientific topics → "de" (German), "fr" (French), "ja" (Japanese) are often detailed
- Historical topics → use the language of the civilization being studied

**Step 3 — Get full articles if needed**
Use get_article with \`full: true\` to retrieve the complete uncompressed wikitext when a partial extract is not enough.

**Step 4 — Compare and synthesize**
Note where editions agree, where they differ, and what unique information each adds.`
              }
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }

  private getToolsList() {
    const commonProps = {
      language: {
        type: 'string',
        description: 'Wikipedia language code (e.g., "en", "si", "ja"). The server automatically resolves English queries to the target language — always write queries in English.'
      },
      country: {
        type: 'string',
        description: 'Country code to infer language (e.g., "US", "LK", "JP"). Automatically mapped to the correct Wikipedia language edition.'
      }
    };

    return [
      {
        name: 'search_wikipedia',
        description: `Search Wikipedia for articles matching a query.

QUERY FORMAT: Use short Wikipedia article title phrases — not full questions, sentences, or temporal words.

Do NOT include "current", "new", "latest", "recent", "former", "today's" in the query. Wikipedia article titles never contain these words.
- ✅ "President of Sri Lanka" — correct
- ❌ "Current President of Sri Lanka" — wrong, remove "Current"
- ❌ "Who is the current president of Sri Lanka?" — wrong

For political positions use: "[Role] of [Country]"
- "President of Sri Lanka", "Prime Minister of Japan", "Chancellor of Germany"

For general topics use the topic name as a Wikipedia article title:
- "Mount Everest", "Eiffel Tower", "World War II", "Sri Lanka"

Always write the query in English. The server automatically finds the equivalent article in the target language when a non-English language or country code is provided.

To search multiple languages at once, use multi_search_wikipedia instead.`,
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Short Wikipedia-style title phrase in English. No temporal words (current/new/latest), no question words. Example: "President of Sri Lanka" not "Current President of Sri Lanka".'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (1-500)',
              default: 10,
              minimum: 1,
              maximum: 500
            },
            ...commonProps
          },
          required: ['query']
        }
      },
      {
        name: 'multi_search_wikipedia',
        description: `Search Wikipedia for multiple queries across multiple languages in a single parallel call. All searches execute simultaneously.

Use this when you need to:
- Search the same topic in multiple languages at once (e.g. "President of Sri Lanka" in English, Sinhala, and Tamil simultaneously)
- Search multiple different topics in one call
- Research a topic across several Wikipedia language editions efficiently

Each search in the array can have its own query, language, country, and limit.

QUERY FORMAT: Same rules as search_wikipedia — short title phrases in English, no temporal words, no question words.
The server automatically resolves each query to the correct article in the specified language.`,
        inputSchema: {
          type: 'object',
          properties: {
            searches: {
              type: 'array',
              description: 'List of searches to execute in parallel. Each item can specify its own query, language, country, and limit.',
              items: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Short Wikipedia-style title phrase in English, e.g. "President of Sri Lanka"'
                  },
                  language: {
                    type: 'string',
                    description: 'Wikipedia language code for this search (e.g. "en", "si", "ja")'
                  },
                  country: {
                    type: 'string',
                    description: 'Country code for this search (e.g. "LK", "JP") — mapped to the correct language automatically'
                  },
                  limit: {
                    type: 'number',
                    description: 'Maximum results for this individual search (1-500). Defaults to 10 if not specified.',
                    default: 10,
                    minimum: 1,
                    maximum: 500
                  }
                },
                required: ['query']
              },
              minItems: 1,
              maxItems: 20
            }
          },
          required: ['searches']
        }
      },
      {
        name: 'get_article',
        description: 'Get the content of a Wikipedia article. By default returns a plain text extract. Pass full: true to get the complete uncompressed article including all sections and wikitext markup — use this when the default extract is missing sections or you need the entire article.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The title of the Wikipedia article'
            },
            full: {
              type: 'boolean',
              description: 'Set to true to retrieve the complete uncompressed wikitext of the entire article. Default is false which returns a plain text extract.',
              default: false
            },
            ...commonProps
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
            },
            ...commonProps
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
            },
            ...commonProps
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
            },
            ...commonProps
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
            },
            ...commonProps
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
            },
            ...commonProps
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
            },
            ...commonProps
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
            },
            ...commonProps
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
            },
            ...commonProps
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
    ];
  }

  // Execute a tool with given arguments
  async executeTool(toolName: string, args: any) {
    try {
      switch (toolName) {
        case 'search_wikipedia':
          return await this.handleSearchWikipedia(args);
        case 'multi_search_wikipedia':
          return await this.handleMultiSearch(args);
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
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool ${toolName}: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  private async handleSearchWikipedia(args: any) {
    const { query, limit = 10 } = args;
    const client = this.getClient(args);

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
    const results = await client.search(query, { limit: validatedLimit });
    const status = results.length > 0 ? 'success' : 'no_results';

    const response: any = {
      query: query,
      results: results,
      status: status,
      count: results.length,
      language: client.getLanguage()
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

  private async handleMultiSearch(args: any) {
    const { searches } = args;

    if (!searches || !Array.isArray(searches) || searches.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              error: 'searches must be a non-empty array',
              status: 'error'
            }, null, 2)
          }
        ]
      };
    }

    // Run all searches in parallel, each with its own client and limit
    const tasks = searches.map(async (s: any) => {
      // Explicitly extract each field to avoid any reference/parsing issues
      const query: string = s.query ?? s.q ?? '';
      const language: string | undefined = s.language;
      const country: string | undefined = s.country;
      const limit: number = Math.min(Math.max(parseInt(s.limit) || 10, 1), 500);

      if (!query.trim()) {
        return {
          query,
          language: language || country || this.wikipediaClient.getLanguage(),
          results: [],
          status: 'error',
          count: 0,
          error: 'Empty query'
        };
      }

      try {
        const client = (language || country)
          ? new WikipediaClient({
              language,
              country,
              enableCache: false,
              botUsername: this.botUsername,
              botPassword: this.botPassword,
            })
          : this.wikipediaClient;

        const results = await client.search(query, { limit });

        return {
          query,
          language: client.getLanguage(),
          results,
          status: results.length > 0 ? 'success' : 'no_results',
          count: results.length
        };
      } catch (error: any) {
        return {
          query,
          language: language || country || this.wikipediaClient.getLanguage(),
          results: [],
          status: 'error',
          count: 0,
          error: error.message
        };
      }
    });

    const results = await Promise.all(tasks);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            total_searches: searches.length,
            results
          }, null, 2)
        }
      ]
    };
  }

  private async handleGetArticle(args: any) {
    const { title, full = false } = args;
    const client = this.getClient(args);

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

    const article = await client.getArticle(title, { full });

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
    const client = this.getClient(args);

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

    const summary = await client.getSummary(title);
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
    const client = this.getClient(args);

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

    const sections = await client.getSections(title);

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
    const client = this.getClient(args);

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

    const links = await client.getLinks(title);

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
    const client = this.getClient(args);

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

    const coordinates = await client.getCoordinates(title);

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
    const client = this.getClient(args);

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

    const relatedTopics = await client.getRelatedTopics(title, limit);

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
    const client = this.getClient(args);

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

    const summary = await client.summarizeForQuery(title, query, max_length);

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
    const client = this.getClient(args);

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

    const summary = await client.summarizeSection(title, section_title, max_length);

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
    const client = this.getClient(args);

    if (!title || !title.trim()) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              title: title,
              facts: [],
              error: 'Invalid title provided'
            }, null, 2)
          }
        ]
      };
    }

    const facts = await client.extractFacts(title, topic_within_article, count);

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
    const client = this.getClient(args);
    const diagnostics = await client.testConnectivity();

    // Round response_time_ms for nicer output
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
}

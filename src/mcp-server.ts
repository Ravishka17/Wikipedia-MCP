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
        description: 'Reminds the assistant to translate search queries into the target Wikipedia language rather than searching in English. For example, when using language "si" (Sinhala), search for "ශ්‍රී ලංකාව" not "Sri Lanka".',
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
        description: 'A full guide on how to use the Wikipedia MCP tools effectively, including language handling, search best practices, and tool selection.',
        arguments: []
      },
      {
        name: 'multilingual_research',
        description: 'Guides the assistant through researching a topic across multiple Wikipedia language editions to get broader or more locally accurate information.',
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
          description: 'Instructions for searching Wikipedia in the correct language',
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `You are about to search Wikipedia for "${topic}" using language code "${language}".

IMPORTANT: You must translate the search query into the native language of the Wikipedia edition you are searching, not search in English.

Rules:
1. The search query passed to search_wikipedia must be in the language matching the language code — not in English.
2. Article titles on non-English Wikipedias are in that language. Searching in English will return no results or wrong results.
3. If you do not know the native-language term for the topic, first use the English Wikipedia (language: "en") to find the article, then look at its interlanguage links or search the target Wikipedia with a transliterated or translated term.

Examples of correct behavior:
- language "si" (Sinhala) → search "ශ්‍රී ලංකාව" not "Sri Lanka"
- language "ja" (Japanese) → search "東京" not "Tokyo"  
- language "ar" (Arabic) → search "مصر" not "Egypt"
- language "zh" (Chinese) → search "人工智能" not "Artificial intelligence"
- language "ko" (Korean) → search "서울" not "Seoul"
- language "el" (Greek) → search "Αθήνα" not "Athens"
- language "ru" (Russian) → search "Москва" not "Moscow"
- language "hi" (Hindi) → search "भारत" not "India"
- language "fa" (Persian) → search "ایران" not "Iran"
- language "th" (Thai) → search "กรุงเทพมหานคร" not "Bangkok"

Now search for "${topic}" in language "${language}" using the correct native-language search term.`
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
- **search_wikipedia** — Search for articles by keyword
- **get_article** — Retrieve full article text
- **get_summary** — Get the introductory summary of an article
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

## Critical Rule: Search in the Target Language
When using a non-English language, your search query MUST be in that language:
- ❌ Wrong: search_wikipedia("Sri Lanka", language: "si")
- ✅ Correct: search_wikipedia("ශ්‍රී ලංකාව", language: "si")

If you don't know the native term, search English Wikipedia first to find the article title, then use interlanguage links or a translated query for the target language.

## Recommended Workflow
1. Use **search_wikipedia** to find the right article title
2. Use **get_summary** for a quick overview
3. Use **get_sections** to understand the article structure
4. Use **summarize_article_for_query** or **summarize_article_section** for targeted information
5. Use **extract_key_facts** for a concise bullet list
6. Use **get_article** only when you need the full text

## Tips
- Article titles are case-sensitive on some Wikipedias — use search first to get the exact title
- For geographic topics, **get_coordinates** returns lat/lon you can use with mapping tools
- **get_related_topics** is useful for discovering context around a subject
- The "simple" language code gives access to Simple English Wikipedia, which is easier to parse`
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
- Information structured differently that may reveal new angles

## Suggested approach

**Step 1 — Start with English**
Use search_wikipedia("${topic}", language: "en") to get the canonical article title and a baseline summary.

**Step 2 — Identify relevant language editions**
Consider which languages would have strong coverage of this topic:
- For topics about a specific country → use that country's language
- For scientific topics → German ("de"), French ("fr"), and Japanese ("ja") Wikipedias are often detailed
- For historical topics → use the language of the civilization being studied
- For regional topics → use the local language

**Step 3 — Search in the native language**
Translate or transliterate "${topic}" into each target language before searching. Do NOT use the English term in non-English Wikipedia searches.

**Step 4 — Compare and synthesize**
Note where editions agree, where they differ, and what unique information each adds.

Remember: always pass the native-language search term to search_wikipedia when using non-English language codes.`
              }
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown prompt: ${name}`);
    }
  }

  // ── Tool definitions ────────────────────────────────────────────────────

  private getToolsList() {
    const commonProps = {
      language: {
        type: 'string',
        description: 'Wikipedia language code (e.g., "en", "es", "ja"). When set, search queries and article titles must be in that language — not in English.'
      },
      country: {
        type: 'string',
        description: 'Country code to infer language (e.g., "US", "JP", "LK"). Automatically mapped to the correct Wikipedia language edition.'
      }
    };

    return [
      {
        name: 'search_wikipedia',
        description: 'Search Wikipedia for articles matching a query. IMPORTANT: when using a non-English language code, the query must be in that language (e.g. use "東京" not "Tokyo" for language "ja").',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search term. Must be in the target language when a non-English language is specified.'
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
        name: 'get_article',
        description: 'Get the full content of a Wikipedia article',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The title of the Wikipedia article, in the language of the target Wikipedia edition.'
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
      response.hint = `If you searched in English on a non-English Wikipedia, try translating the query to language "${client.getLanguage()}" first.`;
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

    const article = await client.getArticle(title);

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

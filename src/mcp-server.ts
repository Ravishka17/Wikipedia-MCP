import { WikipediaClient } from './wikipedia-client.js';
import { getPromptsList, getPrompt } from './prompts.js';
import { getToolsList } from './toolDefinitions.js';
import {
  handleSearchWikipedia,
  handleMultiSearch,
  handleGetArticle,
  handleGetSummary,
  handleGetSections,
  handleGetLinks,
  handleGetCoordinates,
  handleGetRelatedTopics,
  handleSummarizeForQuery,
  handleSummarizeSection,
  handleExtractFacts,
  handleTestConnectivity,
  handleListCountries,
  type BotConfig,
} from './handlers.js';

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
      tools: getToolsList()
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

  getPromptsList() {
    return getPromptsList();
  }

  getPrompt(name: string, args: Record<string, string> = {}) {
    return getPrompt(name, args);
  }

  // Execute a tool with given arguments
  async executeTool(toolName: string, args: any) {
    try {
      const client = this.getClient(args);
      const botConfig: BotConfig = {
        botUsername: this.botUsername,
        botPassword: this.botPassword,
      };

      switch (toolName) {
        case 'search_wikipedia':
          return await handleSearchWikipedia(client, args);
        case 'multi_search_wikipedia':
          // Uses the default client as fallback + botConfig to create per-language sub-clients
          return await handleMultiSearch(this.wikipediaClient, args, botConfig);
        case 'get_article':
          return await handleGetArticle(client, args);
        case 'get_summary':
          return await handleGetSummary(client, args);
        case 'get_sections':
          return await handleGetSections(client, args);
        case 'get_links':
          return await handleGetLinks(client, args);
        case 'get_coordinates':
          return await handleGetCoordinates(client, args);
        case 'get_related_topics':
          return await handleGetRelatedTopics(client, args);
        case 'summarize_article_for_query':
          return await handleSummarizeForQuery(client, args);
        case 'summarize_article_section':
          return await handleSummarizeSection(client, args);
        case 'extract_key_facts':
          return await handleExtractFacts(client, args);
        case 'test_wikipedia_connectivity':
          return await handleTestConnectivity(client, args);
        case 'list_supported_countries':
          return await handleListCountries(args);
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
}

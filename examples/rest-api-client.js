#!/usr/bin/env node

/**
 * Wikipedia REST API Client
 * 
 * This client provides easy access to Wikipedia functionality via REST API
 * when MCP is not available (e.g., on Vercel serverless deployments)
 * 
 * Usage: node rest-api-client.js <action> [options]
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class WikipediaRestClient {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async request(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, params[key]);
      }
    });

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  async search(query, { limit = 10 } = {}) {
    return this.request(`/search/${encodeURIComponent(query)}`, { limit });
  }

  async getArticle(title) {
    return this.request(`/article/${encodeURIComponent(title)}`);
  }

  async getSummary(title) {
    return this.request(`/summary/${encodeURIComponent(title)}`);
  }

  async getSections(title) {
    return this.request(`/sections/${encodeURIComponent(title)}`);
  }

  async getLinks(title) {
    return this.request(`/links/${encodeURIComponent(title)}`);
  }

  async getCoordinates(title) {
    return this.request(`/coordinates/${encodeURIComponent(title)}`);
  }

  async getRelatedTopics(title, { limit = 10 } = {}) {
    return this.request(`/related/${encodeURIComponent(title)}`, { limit });
  }

  async extractFacts(title, { topic, count = 5 } = {}) {
    return this.request(`/facts/${encodeURIComponent(title)}`, { topic, count });
  }

  async testConnectivity() {
    return this.request('/test-connectivity');
  }

  async getSupportedCountries() {
    return this.request('/supported-countries');
  }

  async healthCheck() {
    return this.request('/health');
  }

  async getServerInfo() {
    return this.request('/mcp');
  }
}

// CLI interface
async function main() {
  const [, , action, ...args] = process.argv;
  const baseUrl = process.env.WIKIPEDIA_API_URL || 'http://localhost:8000';
  const client = new WikipediaRestClient(baseUrl);

  try {
    switch (action) {
      case 'health':
        console.log('Health Check:');
        console.log(JSON.stringify(await client.healthCheck(), null, 2));
        break;

      case 'search':
        if (!args[0]) throw new Error('Query required: search <query>');
        console.log('Search Results:');
        console.log(JSON.stringify(await client.search(args[0], { limit: args[1] || 10 }), null, 2));
        break;

      case 'article':
        if (!args[0]) throw new Error('Title required: article <title>');
        console.log('Article:');
        console.log(JSON.stringify(await client.getArticle(args[0]), null, 2));
        break;

      case 'summary':
        if (!args[0]) throw new Error('Title required: summary <title>');
        console.log('Summary:');
        console.log(JSON.stringify(await client.getSummary(args[0]), null, 2));
        break;

      case 'sections':
        if (!args[0]) throw new Error('Title required: sections <title>');
        console.log('Sections:');
        console.log(JSON.stringify(await client.getSections(args[0]), null, 2));
        break;

      case 'links':
        if (!args[0]) throw new Error('Title required: links <title>');
        console.log('Links:');
        console.log(JSON.stringify(await client.getLinks(args[0]), null, 2));
        break;

      case 'coordinates':
        if (!args[0]) throw new Error('Title required: coordinates <title>');
        console.log('Coordinates:');
        console.log(JSON.stringify(await client.getCoordinates(args[0]), null, 2));
        break;

      case 'related':
        if (!args[0]) throw new Error('Title required: related <title>');
        console.log('Related Topics:');
        console.log(JSON.stringify(await client.getRelatedTopics(args[0]), null, 2));
        break;

      case 'facts':
        if (!args[0]) throw new Error('Title required: facts <title> [topic]');
        console.log('Key Facts:');
        console.log(JSON.stringify(await client.extractFacts(args[0], { topic: args[1] }), null, 2));
        break;

      case 'test':
        console.log('Connectivity Test:');
        console.log(JSON.stringify(await client.testConnectivity(), null, 2));
        break;

      case 'countries':
        console.log('Supported Countries:');
        console.log(JSON.stringify(await client.getSupportedCountries(), null, 2));
        break;

      case 'info':
        console.log('Server Info:');
        console.log(JSON.stringify(await client.getServerInfo(), null, 2));
        break;

      default:
        console.log(`
Wikipedia REST API Client

Usage: node rest-api-client.js <action> [options]

Actions:
  health              - Check server health
  info                - Get server information
  search <query> [limit] - Search Wikipedia
  article <title>     - Get full article
  summary <title>     - Get article summary
  sections <title>    - Get article sections
  links <title>       - Get article links
  coordinates <title> - Get geographic coordinates
  related <title>     - Get related topics
  facts <title> [topic] - Extract key facts
  test                - Test connectivity
  countries           - List supported countries

Environment Variables:
  WIKIPEDIA_API_URL   - API base URL (default: http://localhost:8000)

Examples:
  node rest-api-client.js search "artificial intelligence" 5
  node rest-api-client.js summary "Machine learning"
  node rest-api-client.js facts "Python" "programming"
  WIKIPEDIA_API_URL=https://wikipedia-mcp-zeta.vercel.app node rest-api-client.js search "AI" 3
`);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Export for use as a module
module.exports = { WikipediaRestClient };

// Run CLI if executed directly
if (require.main === module) {
  main();
}
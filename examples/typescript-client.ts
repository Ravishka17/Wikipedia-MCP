/**
 * TypeScript Wikipedia REST API Client
 * 
 * This client provides type-safe access to Wikipedia functionality via REST API
 * when MCP is not available (e.g., on Vercel serverless deployments)
 * 
 * Usage: Import and use in your TypeScript/Node.js applications
 */

export interface WikipediaRestClientOptions {
  baseUrl?: string;
  timeout?: number;
}

export interface SearchResult {
  query: string;
  results: Array<{
    title: string;
    snippet: string;
    url: string;
  }>;
  count: number;
  language: string;
}

export interface Article {
  title: string;
  content: string;
  url: string;
  language: string;
}

export interface SummaryResponse {
  title: string;
  summary: string | null;
  error?: string;
}

export interface SectionsResponse {
  title: string;
  sections: Array<{
    title: string;
    level: number;
    content: string;
  }>;
}

export interface LinksResponse {
  title: string;
  links: string[];
}

export interface CoordinatesResponse {
  title: string;
  coordinates: Array<{
    lat: number;
    lon: number;
    name: string;
  }>;
  exists: boolean;
}

export interface RelatedTopicsResponse {
  title: string;
  related_topics: string[];
}

export interface FactsResponse {
  title: string;
  topic_within_article: string | null;
  facts: string[];
}

export interface HealthResponse {
  status: string;
  timestamp: string;
  service: string;
}

export class WikipediaRestClient {
  private baseUrl: string;
  private timeout: number;

  constructor(options: WikipediaRestClientOptions = {}) {
    this.baseUrl = options.baseUrl || 'http://localhost:8000';
    this.timeout = options.timeout || 30000;
  }

  private async request<T>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    
    // Add query parameters
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.append(key, String(params[key]));
      }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Wikipedia-REST-Client/1.0'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timeout after ${this.timeout}ms`);
        }
        throw new Error(`Request failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Search Wikipedia for articles
   */
  async search(query: string, options: { limit?: number } = {}): Promise<SearchResult> {
    return this.request<SearchResult>(`/search/${encodeURIComponent(query)}`, {
      limit: options.limit || 10
    });
  }

  /**
   * Get full article content
   */
  async getArticle(title: string): Promise<Article> {
    return this.request<Article>(`/article/${encodeURIComponent(title)}`);
  }

  /**
   * Get article summary
   */
  async getSummary(title: string): Promise<SummaryResponse> {
    return this.request<SummaryResponse>(`/summary/${encodeURIComponent(title)}`);
  }

  /**
   * Get article sections
   */
  async getSections(title: string): Promise<SectionsResponse> {
    return this.request<SectionsResponse>(`/sections/${encodeURIComponent(title)}`);
  }

  /**
   * Get article links
   */
  async getLinks(title: string): Promise<LinksResponse> {
    return this.request<LinksResponse>(`/links/${encodeURIComponent(title)}`);
  }

  /**
   * Get geographic coordinates
   */
  async getCoordinates(title: string): Promise<CoordinatesResponse> {
    return this.request<CoordinatesResponse>(`/coordinates/${encodeURIComponent(title)}`);
  }

  /**
   * Get related topics
   */
  async getRelatedTopics(title: string, options: { limit?: number } = {}): Promise<RelatedTopicsResponse> {
    return this.request<RelatedTopicsResponse>(`/related/${encodeURIComponent(title)}`, {
      limit: options.limit || 10
    });
  }

  /**
   * Extract key facts
   */
  async extractFacts(
    title: string, 
    options: { topic?: string; count?: number } = {}
  ): Promise<FactsResponse> {
    return this.request<FactsResponse>(`/facts/${encodeURIComponent(title)}`, {
      topic: options.topic,
      count: options.count || 5
    });
  }

  /**
   * Test Wikipedia API connectivity
   */
  async testConnectivity(): Promise<any> {
    return this.request('/test-connectivity');
  }

  /**
   * Get supported countries
   */
  async getSupportedCountries(): Promise<any> {
    return this.request('/supported-countries');
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<HealthResponse> {
    return this.request<HealthResponse>('/health');
  }

  /**
   * Get server information
   */
  async getServerInfo(): Promise<any> {
    return this.request('/mcp');
  }

  /**
   * Query-focused summary
   */
  async summarizeForQuery(
    title: string, 
    query: string, 
    maxLength: number = 250
  ): Promise<any> {
    return this.request(`/summary/${encodeURIComponent(title)}/query/${encodeURIComponent(query)}/length/${maxLength}`);
  }

  /**
   * Section summary
   */
  async summarizeSection(
    title: string, 
    section: string, 
    maxLength: number = 150
  ): Promise<any> {
    return this.request(`/summary/${encodeURIComponent(title)}/section/${encodeURIComponent(section)}/length/${maxLength}`);
  }
}

// Re-export all interfaces for convenience
export * from './types';

// Default export
export default WikipediaRestClient;

// Usage example (uncomment to test)
/*
async function example() {
  const client = new WikipediaRestClient({
    baseUrl: 'https://wikipedia-mcp-zeta.vercel.app'
  });

  try {
    // Search for articles
    const searchResults = await client.search('artificial intelligence', { limit: 5 });
    console.log('Search results:', searchResults);

    // Get article summary
    const summary = await client.getSummary('Machine learning');
    console.log('Summary:', summary);

    // Get related topics
    const related = await client.getRelatedTopics('Artificial intelligence');
    console.log('Related topics:', related);

  } catch (error) {
    console.error('Error:', error);
  }
}

example();
*/
import axios from 'axios';
import { SearchResult, WikipediaArticle, ArticleSection, Coordinates, RelatedTopic } from './types.js';

export class WikipediaClient {
  private language: string;
  private baseUrl: string;
  private accessToken?: string;
  private enableCache: boolean;
  private cache: Map<string, any> = new Map();

  // Country to language mapping (same as original Python version)
  public static readonly COUNTRY_TO_LANGUAGE: Record<string, string> = {
    'US': 'en', 'USA': 'en', 'United States': 'en', 'UK': 'en', 'GB': 'en', 
    'United Kingdom': 'en', 'Canada': 'en', 'Australia': 'en', 'New Zealand': 'en',
    'Ireland': 'en', 'South Africa': 'en', 'CN': 'zh-hans', 'China': 'zh-hans',
    'TW': 'zh-tw', 'Taiwan': 'zh-tw', 'JP': 'ja', 'Japan': 'ja',
    'DE': 'de', 'Germany': 'de', 'FR': 'fr', 'France': 'fr',
    'ES': 'es', 'Spain': 'es', 'MX': 'es', 'Mexico': 'es',
    'AR': 'es', 'Argentina': 'es', 'PT': 'pt', 'Portugal': 'pt',
    'BR': 'pt', 'Brazil': 'pt', 'RU': 'ru', 'Russia': 'ru',
    'SA': 'ar', 'Saudi Arabia': 'ar', 'AE': 'ar', 'UAE': 'ar',
    'EG': 'ar', 'Egypt': 'ar', 'IT': 'it', 'Italy': 'it',
    'NL': 'nl', 'Netherlands': 'nl', 'PL': 'pl', 'Poland': 'pl',
    'TR': 'tr', 'Turkey': 'tr', 'KR': 'ko', 'South Korea': 'ko',
    'IN': 'hi', 'India': 'hi', 'ID': 'id', 'Indonesia': 'id',
    'TH': 'th', 'Thailand': 'th', 'VI': 'vi', 'Vietnam': 'vi',
    'GR': 'el', 'Greece': 'el', 'HE': 'he', 'Hebrew': 'he',
    'HI': 'hi', 'Hindi': 'hi', 'ENG': 'en', 'EN': 'en'
  };

  constructor(options: {
    language?: string;
    country?: string;
    enableCache?: boolean;
    accessToken?: string;
  } = {}) {
    this.language = options.language || 'en';
    this.accessToken = options.accessToken;
    this.enableCache = options.enableCache || false;

    // Handle country mapping
    if (options.country) {
      const countryCode = options.country.toUpperCase();
      const mappedLanguage = WikipediaClient.COUNTRY_TO_LANGUAGE[countryCode];
      if (mappedLanguage) {
        this.language = mappedLanguage;
      } else {
        throw new Error(`Unsupported country: ${options.country}. Use --list-countries to see supported options.`);
      }
    }

    this.baseUrl = `https://${this.language}.wikipedia.org/w/api.php`;
  }

  getLanguage(): string {
    return this.language;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'User-Agent': 'Wikipedia-MCP-Server/1.0.0 (https://vercel.com/wikipedia-mcp)'
    };
    
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    
    return headers;
  }

  private getCacheKey(method: string, params: Record<string, any>): string {
    return `${method}_${JSON.stringify(params)}`;
  }

  private getFromCache(key: string): any | null {
    if (!this.enableCache) return null;
    return this.cache.get(key);
  }

  private setCache(key: string, value: any): void {
    if (!this.enableCache) return;
    this.cache.set(key, value);
    
    // Simple cache size limit
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
  }

  private async makeRequest(params: Record<string, any>): Promise<any> {
    const cacheKey = this.getCacheKey('request', params);
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          format: 'json',
          ...params
        },
        headers: this.getHeaders(),
        timeout: 10000
      });

      const data = response.data;
      this.setCache(cacheKey, data);
      return data;
    } catch (error: any) {
      console.error('Wikipedia API request failed:', error.message);
      throw new Error(`Wikipedia API error: ${error.message}`);
    }
  }

  async search(query: string, options: { limit?: number } = {}): Promise<SearchResult[]> {
    if (!query || !query.trim()) {
      return [];
    }

    const params = {
      action: 'query',
      list: 'search',
      srsearch: query,
      srlimit: options.limit || 10,
      srsort: 'relevance'
    };

    const data = await this.makeRequest(params);
    
    if (data.query && data.query.search) {
      return data.query.search.map((item: any) => ({
        title: item.title,
        snippet: item.snippet,
        pageid: item.pageid,
        url: `https://${this.language}.wikipedia.org/wiki/${encodeURIComponent(item.title)}`
      }));
    }

    return [];
  }

  async getArticle(title: string): Promise<WikipediaArticle> {
    if (!title || !title.trim()) {
      return {
        title: title,
        pageid: 0,
        exists: false,
        error: 'Invalid title provided'
      };
    }

    const params = {
      action: 'query',
      prop: 'extracts|info|categories',
      titles: title,
      exintro: false,
      explaintext: true,
      inprop: 'url|preload',
      clshow: '!hidden',
      redirects: 1,
      formatversion: 2
    };

    try {
      const data = await this.makeRequest(params);
      
      if (data.query && data.query.pages) {
        const page = data.query.pages[0];
        
        if (page.missing !== undefined) {
          return {
            title: title,
            pageid: 0,
            exists: false,
            error: 'Article not found'
          };
        }

        return {
          title: page.title,
          pageid: page.pageid,
          summary: this.extractSummary(page.extract),
          text: page.extract,
          links: [], // Will be populated separately if needed
          categories: page.categories ? page.categories.map((cat: any) => cat.title) : [],
          exists: true
        };
      }

      return {
        title: title,
        pageid: 0,
        exists: false,
        error: 'Article not found'
      };
    } catch (error: any) {
      return {
        title: title,
        pageid: 0,
        exists: false,
        error: error.message
      };
    }
  }

  async getSummary(title: string): Promise<string> {
    if (!title || !title.trim()) {
      return 'Error: Invalid title provided';
    }

    const params = {
      action: 'query',
      prop: 'extracts',
      titles: title,
      exintro: true,
      explaintext: true,
      redirects: 1,
      formatversion: 2
    };

    try {
      const data = await this.makeRequest(params);
      
      if (data.query && data.query.pages) {
        const page = data.query.pages[0];
        
        if (page.missing !== undefined) {
          return 'Error: Article not found';
        }

        return page.extract || 'Error: No summary available';
      }

      return 'Error: Article not found';
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  async getSections(title: string): Promise<ArticleSection[]> {
    if (!title || !title.trim()) {
      return [];
    }

    const params = {
      action: 'parse',
      page: title,
      prop: 'sections',
      formatversion: 2
    };

    try {
      const data = await this.makeRequest(params);
      
      if (data.parse && data.parse.sections) {
        return data.parse.sections.map((section: any) => ({
          title: section.line,
          content: '', // Content would require additional requests
          level: section.level
        }));
      }

      return [];
    } catch (error: any) {
      console.error('Error getting sections:', error.message);
      return [];
    }
  }

  async getLinks(title: string): Promise<string[]> {
    if (!title || !title.trim()) {
      return [];
    }

    const params = {
      action: 'query',
      prop: 'links',
      titles: title,
      pllimit: 500,
      formatversion: 2
    };

    try {
      const data = await this.makeRequest(params);
      
      if (data.query && data.query.pages) {
        const page = data.query.pages[0];
        if (page.links) {
          return page.links.map((link: any) => link.title);
        }
      }

      return [];
    } catch (error: any) {
      console.error('Error getting links:', error.message);
      return [];
    }
  }

  async getCoordinates(title: string): Promise<any> {
    if (!title || !title.trim()) {
      return {
        title: title,
        pageid: 0,
        coordinates: [],
        exists: false,
        error: 'Invalid title provided'
      };
    }

    const params = {
      action: 'query',
      prop: 'coordinates',
      titles: title,
      coprop: 'type|name|dim|globe',
      formatversion: 2
    };

    try {
      const data = await this.makeRequest(params);
      
      if (data.query && data.query.pages) {
        const page = data.query.pages[0];
        
        if (page.missing !== undefined) {
          return {
            title: title,
            pageid: 0,
            coordinates: [],
            exists: false,
            error: 'Article not found'
          };
        }

        const coordinates = page.coordinates ? page.coordinates.map((coord: any) => ({
          latitude: coord.lat,
          longitude: coord.lon,
          globe: coord.globe || 'earth',
          type: coord.type,
          dim: coord.dim,
          name: coord.name
        })) : [];

        return {
          title: page.title,
          pageid: page.pageid,
          coordinates,
          exists: true
        };
      }

      return {
        title: title,
        pageid: 0,
        coordinates: [],
        exists: false,
        error: 'Article not found'
      };
    } catch (error: any) {
      return {
        title: title,
        pageid: 0,
        coordinates: [],
        exists: false,
        error: error.message
      };
    }
  }

  async getRelatedTopics(title: string, limit: number = 10): Promise<RelatedTopic[]> {
    if (!title || !title.trim()) {
      return [];
    }

    try {
      // Get links from the article
      const links = await this.getLinks(title);
      
      // Get summaries for related topics (simplified)
      const relatedTopics: RelatedTopic[] = [];
      
      for (const link of links.slice(0, limit)) {
        try {
          const summary = await this.getSummary(link);
          if (summary && !summary.startsWith('Error:')) {
            relatedTopics.push({
              title: link,
              description: summary.substring(0, 200) + (summary.length > 200 ? '...' : ''),
              relevance: 0.8 // Default relevance
            });
          }
        } catch (error) {
          // Skip articles that can't be retrieved
          continue;
        }
      }

      return relatedTopics;
    } catch (error: any) {
      console.error('Error getting related topics:', error.message);
      return [];
    }
  }

  async summarizeForQuery(title: string, query: string, maxLength: number = 250): Promise<string> {
    if (!title || !title.trim() || !query || !query.trim()) {
      return 'Error: Invalid title or query provided';
    }

    try {
      const article = await this.getArticle(title);
      if (!article.exists || !article.text) {
        return 'Error: Article not found or no content available';
      }

      // Simple query-focused summary: find relevant sentences
      const sentences = article.text.split(/[.!?]+/);
      const queryWords = query.toLowerCase().split(/\s+/);
      
      const relevantSentences = sentences.filter(sentence => {
        const lowerSentence = sentence.toLowerCase();
        return queryWords.some(word => lowerSentence.includes(word));
      });

      if (relevantSentences.length === 0) {
        // Fallback to general summary
        return await this.getSummary(title);
      }

      // Combine relevant sentences and limit length
      const summary = relevantSentences.join('. ').trim();
      if (summary.length > maxLength) {
        return summary.substring(0, maxLength) + '...';
      }
      
      return summary;
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  async summarizeSection(title: string, sectionTitle: string, maxLength: number = 150): Promise<string> {
    if (!title || !title.trim() || !sectionTitle || !sectionTitle.trim()) {
      return 'Error: Invalid title or section title provided';
    }

    try {
      const article = await this.getArticle(title);
      if (!article.exists || !article.text) {
        return 'Error: Article not found or no content available';
      }

      // Simple section extraction (basic implementation)
      const lines = article.text.split('\n');
      let sectionContent = '';
      let inTargetSection = false;
      let currentSectionLevel = 0;

      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Detect section headers (basic pattern matching)
        const headerMatch = trimmedLine.match(/^(=+)\s*(.+?)\s*\1$/);
        if (headerMatch) {
          const headerLevel = headerMatch[1].length;
          const headerText = headerMatch[2].trim();
          
          if (headerText.toLowerCase() === sectionTitle.toLowerCase()) {
            inTargetSection = true;
            currentSectionLevel = headerLevel;
          } else if (inTargetSection && headerLevel <= currentSectionLevel) {
            break; // End of target section
          }
        } else if (inTargetSection && trimmedLine) {
          sectionContent += trimmedLine + ' ';
        }
      }

      if (!sectionContent.trim()) {
        return 'Error: Section not found';
      }

      if (sectionContent.length > maxLength) {
        return sectionContent.substring(0, maxLength) + '...';
      }

      return sectionContent.trim();
    } catch (error: any) {
      return `Error: ${error.message}`;
    }
  }

  async extractFacts(title: string, topic?: string, count: number = 5): Promise<string[]> {
    if (!title || !title.trim()) {
      return [];
    }

    try {
      const article = await this.getArticle(title);
      if (!article.exists || !article.text) {
        return [];
      }

      let content = article.text;
      
      // Focus on specific topic if provided
      if (topic && topic.trim()) {
        const topicSummary = await this.summarizeForQuery(title, topic, 1000);
        if (topicSummary && !topicSummary.startsWith('Error:')) {
          content = topicSummary;
        }
      }

      // Extract sentences that look like facts
      const sentences = content.split(/[.!?]+/);
      const facts: string[] = [];
      
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed.length < 20) continue; // Too short to be a meaningful fact
        if (trimmed.length > 300) continue; // Too long for a single fact
        
        // Simple heuristics for fact-like sentences
        if (trimmed.match(/\b(is|are|was|were|has|have|can|cannot|must|should)\b/i) ||
            trimmed.match(/\b\d{1,4}\b/) || // Contains numbers
            trimmed.match(/\b(born|died|established|founded|created|invented)\b/i)) {
          facts.push(trimmed);
          if (facts.length >= count) break;
        }
      }

      return facts;
    } catch (error: any) {
      console.error('Error extracting facts:', error.message);
      return [];
    }
  }

  async testConnectivity(): Promise<any> {
    const startTime = Date.now();
    
    try {
      const params = {
        action: 'query',
        meta: 'siteinfo',
        siprop: 'general',
        format: 'json'
      };

      const data = await this.makeRequest(params);
      const responseTime = Date.now() - startTime;

      if (data.query && data.query.general) {
        const siteInfo = data.query.general;
        return {
          status: 'success',
          base_url: `https://${this.language}.wikipedia.org`,
          language: this.language,
          site_name: siteInfo.sitename || 'Wikipedia',
          response_time_ms: responseTime
        };
      }

      return {
        status: 'failed',
        error: 'Invalid response from Wikipedia API',
        response_time_ms: responseTime
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      return {
        status: 'failed',
        error: error.message,
        response_time_ms: responseTime
      };
    }
  }

  private extractSummary(text: string): string {
    if (!text) return '';
    
    // Take first paragraph or first 500 characters
    const paragraphs = text.split('\n\n');
    const firstParagraph = paragraphs[0];
    
    if (firstParagraph.length <= 500) {
      return firstParagraph;
    }
    
    return firstParagraph.substring(0, 500) + '...';
  }

  static listSupportedCountries(): Record<string, any> {
    const countriesByLanguage: Record<string, string[]> = {};
    
    for (const [country, language] of Object.entries(WikipediaClient.COUNTRY_TO_LANGUAGE)) {
      if (!countriesByLanguage[language]) {
        countriesByLanguage[language] = [];
      }
      countriesByLanguage[language].push(country);
    }

    return countriesByLanguage;
  }
}

export interface SearchResult {
  title: string;
  snippet: string;
  pageid: number;
  url?: string;
}

export interface WikipediaArticle {
  title: string;
  pageid: number;
  summary?: string;
  text?: string;
  sections?: ArticleSection[];
  links?: string[];
  categories?: string[];
  exists: boolean;
  error?: string;
}

export interface ArticleSection {
  title: string;
  content: string;
  level: number;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  globe: string;
  type?: string;
  dim?: string;
  name?: string;
}

export interface RelatedTopic {
  title: string;
  description?: string;
  relevance?: number;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPServerInfo {
  name: string;
  version: string;
  description: string;
  protocolVersion: string;
  tools: MCPTool[];
}

export interface CountryMapping {
  [countryCode: string]: {
    language: string;
    name: string;
  };
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
}

export interface SummaryOptions {
  maxLength?: number;
}

export interface FactsOptions {
  topic?: string;
  count?: number;
}

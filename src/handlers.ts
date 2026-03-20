import { WikipediaClient } from './wikipedia-client.js';
import { sanitizeTitle, sanitizeQuery } from './sanitize.js';

// Bot credentials are optional — passed through when creating per-language
// sub-clients inside handleMultiSearch so authenticated requests still work.
export type BotConfig = { botUsername?: string; botPassword?: string };

export type MCPResult = {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
};

// ── Handlers ─────────────────────────────────────────────────────────────────

export async function handleSearchWikipedia(client: WikipediaClient, args: any): Promise<MCPResult> {
  // ★ Sanitize query (flagged: SQL injection param)
  const query = sanitizeQuery(args.query);
  const { limit = 10 } = args;

  if (!query) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            query: args.query,
            results: [],
            status: 'error',
            message: 'Empty or invalid search query provided'
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

export async function handleMultiSearch(
  defaultClient: WikipediaClient,
  args: any,
  botConfig: BotConfig
): Promise<MCPResult> {
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
    // Handle both plain string items ("Cat") and object items ({ query: "Cat", language: "en" })
    const isString = typeof s === 'string';
    const rawQuery: string = isString ? s : (s.query ?? s.q ?? '');
    // ★ Sanitize each sub-query
    const query = sanitizeQuery(rawQuery);
    const language: string | undefined = isString ? undefined : s.language;
    const country: string | undefined = isString ? undefined : s.country;
    const limit: number = isString ? 10 : Math.min(Math.max(parseInt(s.limit) || 10, 1), 500);

    if (!query) {
      return {
        query: rawQuery,
        language: language || country || defaultClient.getLanguage(),
        results: [],
        status: 'error',
        count: 0,
        error: 'Empty or invalid query'
      };
    }

    try {
      const client = (language || country)
        ? new WikipediaClient({
            language,
            country,
            enableCache: false,
            botUsername: botConfig.botUsername,
            botPassword: botConfig.botPassword,
          })
        : defaultClient;

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
        language: language || country || defaultClient.getLanguage(),
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

export async function handleGetArticle(client: WikipediaClient, args: any): Promise<MCPResult> {
  const title = sanitizeTitle(args.title);
  const { full = false } = args;

  if (!title) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: args.title,
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

export async function handleGetSummary(client: WikipediaClient, args: any): Promise<MCPResult> {
  const title = sanitizeTitle(args.title);

  if (!title) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: args.title,
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

export async function handleGetSections(client: WikipediaClient, args: any): Promise<MCPResult> {
  const title = sanitizeTitle(args.title);

  if (!title) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: args.title,
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

export async function handleGetLinks(client: WikipediaClient, args: any): Promise<MCPResult> {
  const title = sanitizeTitle(args.title);

  if (!title) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: args.title,
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

export async function handleGetCoordinates(client: WikipediaClient, args: any): Promise<MCPResult> {
  const title = sanitizeTitle(args.title);

  if (!title) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: args.title,
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

export async function handleGetRelatedTopics(client: WikipediaClient, args: any): Promise<MCPResult> {
  const title = sanitizeTitle(args.title);
  const { limit = 10 } = args;

  if (!title) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: args.title,
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

export async function handleSummarizeForQuery(client: WikipediaClient, args: any): Promise<MCPResult> {
  // ★ Sanitize both params (query flagged: SQL injection param)
  const title = sanitizeTitle(args.title);
  const query = sanitizeQuery(args.query);
  const { max_length = 250 } = args;

  if (!title || !query) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: args.title,
            query: args.query,
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

export async function handleSummarizeSection(client: WikipediaClient, args: any): Promise<MCPResult> {
  const title = sanitizeTitle(args.title);
  const section_title = sanitizeTitle(args.section_title);
  const { max_length = 150 } = args;

  if (!title || !section_title) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: args.title,
            section_title: args.section_title,
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

export async function handleExtractFacts(client: WikipediaClient, args: any): Promise<MCPResult> {
  const title = sanitizeTitle(args.title);
  const topic_within_article = args.topic_within_article
    ? sanitizeQuery(args.topic_within_article)
    : undefined;
  const { count = 5 } = args;

  if (!title) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            title: args.title,
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

export async function handleTestConnectivity(client: WikipediaClient, _args: any): Promise<MCPResult> {
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

export async function handleListCountries(_args: any): Promise<MCPResult> {
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

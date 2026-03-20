export function getToolsList() {
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
            description: 'Short Wikipedia-style title phrase in English. No temporal words (current/new/latest), no question words. Example: "President of Sri Lanka" not "Current President of Sri Lanka".',
            maxLength: 500
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
                  description: 'Short Wikipedia-style title phrase in English, e.g. "President of Sri Lanka"',
                  maxLength: 500
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
            description: 'The title of the Wikipedia article',
            maxLength: 300
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
            description: 'The title of the Wikipedia article',
            maxLength: 300
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
            description: 'The title of the Wikipedia article',
            maxLength: 300
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
            description: 'The title of the Wikipedia article',
            maxLength: 300
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
            description: 'The title of the Wikipedia article',
            maxLength: 300
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
            description: 'The title of the Wikipedia article',
            maxLength: 300
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
            description: 'The title of the Wikipedia article',
            maxLength: 300
          },
          query: {
            type: 'string',
            description: 'The query to focus the summary on',
            maxLength: 500
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
            description: 'The title of the Wikipedia article',
            maxLength: 300
          },
          section_title: {
            type: 'string',
            description: 'The title of the section to summarize',
            maxLength: 300
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
            description: 'The title of the Wikipedia article',
            maxLength: 300
          },
          topic_within_article: {
            type: 'string',
            description: 'A specific topic within the article to focus fact extraction',
            maxLength: 300
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

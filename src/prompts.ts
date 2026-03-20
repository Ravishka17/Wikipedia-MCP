import { sanitizeInput, sanitizeQuery } from './sanitize.js';

export function getPromptsList() {
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

export function getPrompt(name: string, args: Record<string, string> = {}) {
  switch (name) {

    case 'search_in_native_language': {
      const language = sanitizeInput(args.language) || 'the target language';
      const topic = sanitizeQuery(args.topic) || 'the requested topic';
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
      const topic = sanitizeQuery(args.topic) || 'the requested topic';
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

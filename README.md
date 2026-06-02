# Wikipedia MCP Server

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/wikipedia-mcp-vercel)

A Model Context Protocol (MCP) server that provides comprehensive Wikipedia access for AI assistants. Built in TypeScript, deployed on Vercel, and fully compatible with the **MCP Streamable HTTP transport** (protocol version `2025-03-26`).

## Features

- 🔍 **Advanced Search** — find articles with relevance ranking
- 📄 **Full Article Access** — plain text extracts or complete wikitext
- 📝 **Smart Summaries** — concise summaries tailored to a specific query
- 🗂️ **Section Analysis** — extract and summarize individual sections
- 🔗 **Link Discovery** — internal links and related articles
- 🌍 **Multi-language** — 50+ language codes, 140+ country codes, resolved automatically
- 🔀 **Parallel Search** — `multi_search_wikipedia` runs multiple queries simultaneously
- 🎯 **Fact Extraction** — structured key-fact lists from any article
- 📍 **Coordinates** — lat/lon for geographic articles
- ⚡ **Streamable HTTP** — full MCP transport support (POST + GET SSE + DELETE)
- 🔒 **Security hardened** — input sanitization, tiered rate limiting, no `Server` header
- 🚀 **Vercel ready** — stateless serverless deployment, zero cold-start friction

---

## Quick Start

### 1. Deploy

```bash
git clone https://github.com/YOUR_USERNAME/wikipedia-mcp-vercel.git
cd wikipedia-mcp-vercel
vercel
```

Or use the **Deploy with Vercel** button above.

### 2. Connect your AI client

The server implements **MCP Streamable HTTP transport** (`2025-03-26`).  
Both the POST channel (client → server) and the GET SSE channel (server → client) are supported.

**MCP endpoint:** `https://your-app.vercel.app/mcp`

#### Claude Desktop

```json
{
  "mcpServers": {
    "wikipedia": {
      "type": "http",
      "url": "https://your-app.vercel.app/mcp"
    }
  }
}
```

#### Claude Code / CLI

```bash
claude mcp add wikipedia --transport http https://your-app.vercel.app/mcp
```

#### Any MCP client (generic)

Configure the client with transport type `streamable-http` and the endpoint URL above.  
The server uses **stateless mode** (no `Mcp-Session-Id` header), which is correct and expected for serverless deployments.

### 3. Environment variables (optional)

| Variable | Default | Description |
|---|---|---|
| `WIKIPEDIA_LANGUAGE` | `en` | Wikipedia language code (e.g. `ja`, `es`, `de`) |
| `WIKIPEDIA_COUNTRY` | `US` | Country code → language mapping (e.g. `JP`, `CN`, `LK`) |
| `ENABLE_CACHE` | `false` | In-memory cache (useful for local dev) |
| `WIKIPEDIA_BOT_USERNAME` | — | Bot account username (`Account@BotName`) |
| `WIKIPEDIA_BOT_PASSWORD` | — | Bot account password |
| `PORT` | `8000` | Local dev port (ignored by Vercel) |

Copy `.env.example` → `.env` for local development.

### 4. Verify

```bash
# Health check
curl https://your-app.vercel.app/health

# Test MCP initialize
curl -X POST https://your-app.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'
```

---

## MCP Tools

All 13 tools accept optional `language` (e.g. `"ja"`) and `country` (e.g. `"JP"`) parameters. When set, the query is sent as-is to that language's Wikipedia endpoint (e.g. `ja.wikipedia.org`). Wikipedia's own search can often match a short English title phrase to the correct local article, but there is no translation layer in this server.

### Tool reference

| Tool | Description |
|---|---|
| `search_wikipedia` | Search by keyword in one language |
| `multi_search_wikipedia` | Run multiple searches across multiple languages in parallel |
| `get_article` | Full article — plain text extract, or wikitext with `full: true` |
| `get_summary` | Introductory summary only |
| `get_sections` | Table of contents (section titles + levels) |
| `get_links` | All internal wikilinks in an article |
| `get_coordinates` | Latitude/longitude for geographic articles |
| `get_related_topics` | Related articles via link graph |
| `summarize_article_for_query` | Summary focused on a specific question |
| `summarize_article_section` | Summary of one named section |
| `extract_key_facts` | Bullet-list of key facts |
| `test_wikipedia_connectivity` | API diagnostics + auth status |
| `list_supported_countries` | All supported language and country codes |

### MCP Prompts

Three prompt templates are registered and available via `prompts/list` / `prompts/get`:

| Prompt | Description |
|---|---|
| `search_in_native_language` | Query format guidance for non-English Wikipedia |
| `wikipedia_usage_guide` | Full guide covering all tools and best practices |
| `multilingual_research` | Step-by-step guide for cross-language research |

---

## REST API

Standard HTTP endpoints for non-MCP usage:

```
GET  /health
GET  /search/:query?limit=10
GET  /article/:title
GET  /summary/:title
GET  /sections/:title
GET  /links/:title
GET  /coordinates/:title
GET  /related/:title?limit=10
GET  /summary/:title/query/:query/length/:maxLength
GET  /summary/:title/section/:section/length/:maxLength
GET  /facts/:title?topic=...&count=5
GET  /test-connectivity
GET  /supported-countries
POST /tools/:toolName
```

---

## Architecture

```
src/
├── server.ts               # Express app wiring
├── routes/
│   ├── mcp.ts              # Streamable HTTP transport (POST + GET SSE + DELETE)
│   └── rest.ts             # REST endpoints
├── mcp-server.ts           # MCPServer helper — tool dispatch, language routing
├── handlers.ts             # Tool handler functions
├── toolRegistrations.ts    # SDK tool + prompt registration
├── toolDefinitions.ts      # JSON Schema definitions (for REST /mcp info)
├── prompts.ts              # Prompt template logic
├── wikipedia-client.ts     # Wikipedia Action API client
├── sanitize.ts             # Input sanitization
├── middleware.ts           # Rate limiting, Server header removal
├── utils.ts                # Shared helpers
└── types.ts                # TypeScript interfaces
```

### Transport design

The server uses **stateless Streamable HTTP** — the correct mode for serverless platforms:

- `POST /mcp` — receives JSON-RPC messages, returns JSON or SSE stream
- `GET /mcp` — opens an SSE channel for server-initiated messages (clients reconnect on timeout)
- `DELETE /mcp` — session termination (acknowledged; no server-side sessions to clean up)

A fresh `McpServer` + `StreamableHTTPServerTransport` instance is created for each request. All Wikipedia logic is handled by the shared, stateless `MCPServer` helper.

---

## Development

```bash
npm install
npm run dev       # tsx watch mode on port 8000
npm run build     # tsc → dist/
npm start         # node dist/server.js
vercel dev        # local Vercel simulation
```

---

## Bot authentication

For higher Wikipedia API rate limits, create a bot password:

1. Log in to your Wikipedia account
2. Go to [Special:BotPasswords](https://en.wikipedia.org/wiki/Special:BotPasswords)
3. Create a new bot password
4. Set `WIKIPEDIA_BOT_USERNAME=YourAccount@BotName` and `WIKIPEDIA_BOT_PASSWORD=...`

---

## License

MIT

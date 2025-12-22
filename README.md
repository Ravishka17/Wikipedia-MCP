# Wikipedia MCP Server for Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/wikipedia-mcp-vercel)

A high-performance Model Context Protocol (MCP) server that provides comprehensive Wikipedia access for AI assistants. This TypeScript implementation is designed for deployment on Vercel and offers all the functionality of the original Python version with enhanced performance and scalability.

## Features

- 🔍 **Advanced Search**: Find Wikipedia articles with intelligent ranking
- 📄 **Full Article Access**: Retrieve complete article content with metadata
- 📝 **Smart Summaries**: Get concise, focused summaries tailored to specific queries
- 🗂️ **Section Analysis**: Extract and summarize specific article sections
- 🔗 **Link Discovery**: Find related articles and cross-references
- 🌍 **Multi-language Support**: Access Wikipedia in 50+ languages and 140+ country variants dynamically
- 📍 **Geographic Data**: Extract coordinates and location information
- 🎯 **Fact Extraction**: Intelligent extraction of key facts from articles
- ⚡ **Performance Optimized**: Caching, rate limiting, and optimized API calls
- 🔧 **Developer Friendly**: Comprehensive API and CLI tools
- 🚀 **Vercel Ready**: Optimized for serverless deployment with SSE support

## Quick Start

### 1. Clone and Deploy

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/wikipedia-mcp-vercel.git
cd wikipedia-mcp-vercel

# Deploy to Vercel
vercel

# Or use the Vercel button above
```

### 2. Connect Your AI Assistant

The server uses Server-Sent Events (SSE) for MCP communication. Configure your AI assistant (like Claude Desktop) to connect to your Vercel deployment:

**SSE Endpoint**: `https://your-app.vercel.app/sse`

```json
{
  "mcpServers": {
    "wikipedia": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sse-client",
        "--url",
        "https://your-app.vercel.app/sse"
      ]
    }
  }
}
```

### 3. Environment Variables (Optional)

```env
# Enable caching for better performance
ENABLE_CACHE=true

# Wikipedia API access token (optional, for rate limiting)
WIKIPEDIA_ACCESS_TOKEN=your_token_here

# Default Language (fallback if not specified in tool calls)
WIKIPEDIA_LANGUAGE=en
```

### 4. Test Your Deployment

```bash
# Health check
curl https://your-app.vercel.app/health

# MCP server info
curl https://your-app.vercel.app/mcp
```

## API Documentation

### MCP Tools

The server provides 12 MCP tools for comprehensive Wikipedia access. **All tools support dynamic language selection via optional arguments.**

#### Common Arguments for All Tools

- `language`: Wikipedia language code (e.g., "es", "ja", "fr"). Overrides default.
- `country`: Country code to infer language (e.g., "US", "JP", "CN"). Overrides default.

#### `search_wikipedia`
Search Wikipedia for articles matching a query.

```typescript
{
  "query": "artificial intelligence",
  "limit": 10,
  "language": "en" // Optional: search English Wikipedia
}
```

#### `get_article`
Get the full content of a Wikipedia article.

```typescript
{
  "title": "Artificial intelligence",
  "language": "es" // Optional: get from Spanish Wikipedia
}
```

#### `get_summary`
Get a concise summary of a Wikipedia article.

```typescript
{
  "title": "Machine learning",
  "country": "JP" // Optional: infer language from country code (Japanese)
}
```

#### `get_sections`
Get the sections of a Wikipedia article.

```typescript
{
  "title": "Deep learning"
}
```

#### `get_links`
Get the links contained within a Wikipedia article.

```typescript
{
  "title": "Neural network"
}
```

#### `get_coordinates`
Get the coordinates of a Wikipedia article.

```typescript
{
  "title": "Paris"
}
```

#### `get_related_topics`
Get topics related to a Wikipedia article.

```typescript
{
  "title": "Python",
  "limit": 10
}
```

#### `summarize_article_for_query`
Get a summary tailored to a specific query.

```typescript
{
  "title": "Climate change",
  "query": "economic impact",
  "max_length": 300
}
```

#### `summarize_article_section`
Get a summary of a specific section.

```typescript
{
  "title": "World War II",
  "section_title": "Causes",
  "max_length": 200
}
```

#### `extract_key_facts`
Extract key facts from an article.

```typescript
{
  "title": "Albert Einstein",
  "topic_within_article": "scientific contributions",
  "count": 5
}
```

#### `test_wikipedia_connectivity`
Test Wikipedia API connectivity and performance.

```typescript
{}
```

#### `list_supported_countries`
List all supported country/locale codes.

```typescript
{}
```

### REST Endpoints

The server also provides standard REST endpoints for non-MCP usage:

```bash
GET /search/{query}?limit={number}
GET /article/{title}
GET /summary/{title}
# ... and more
```

## Architecture

### Components

1. **WikipediaClient**: Core Wikipedia API client with caching
2. **MCPServer**: MCP protocol implementation (supports SSE)
3. **Express Server**: HTTP API and REST endpoints
4. **TypeScript**: Type-safe development and compilation

### Performance Features

- **Intelligent Caching**: Reduces API calls and improves response times
- **Rate Limiting**: Respects Wikipedia API limits
- **Error Handling**: Robust error handling with detailed responses
- **Connection Pooling**: Efficient HTTP connection management
- **Memory Optimization**: Optimized for serverless environments

## Development

### Local Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Project Structure

```
src/
├── types.ts              # TypeScript type definitions
├── wikipedia-client.ts   # Wikipedia API client
├── mcp-server.ts         # MCP protocol server logic
└── server.ts             # Express server, SDK integration, and routes
```

## Deployment

### Vercel (Recommended)

1. **One-click Deploy**: Use the deploy button above
2. **CLI Deploy**:
   ```bash
   vercel
   ```

### Other Platforms

The server can be deployed to any Node.js platform:

```bash
# Build the project
npm run build

# Start the server
npm start
```

## Rate Limiting and API Keys

For high-volume usage, obtain a Wikipedia API access token:

1. Create a Wikipedia account
2. Generate an API token at [Special:BotPasswords](https://en.wikipedia.org/wiki/Special:BotPasswords)
3. Set the `WIKIPEDIA_ACCESS_TOKEN` environment variable

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Development Guidelines

- Follow TypeScript strict mode
- Add JSDoc comments for all public methods
- Include error handling for all API calls
- Test with multiple Wikipedia languages
- Ensure compatibility with MCP protocol

## License

MIT License - see LICENSE file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/wikipedia-mcp-vercel/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/wikipedia-mcp-vercel/discussions)
- **Documentation**: [Wiki](https://github.com/YOUR_USERNAME/wikipedia-mcp-vercel/wiki)

## Comparison with Python Version

| Feature | Python Version | TypeScript Version |
|---------|---------------|-------------------|
| Performance | Good | Excellent |
| Deployment | Local/Docker | Serverless/Vercel |
| Memory Usage | Higher | Optimized |
| Cold Start | N/A | Minimal |
| Scalability | Horizontal | Auto-scaling |
| Type Safety | Dynamic | Full TypeScript |

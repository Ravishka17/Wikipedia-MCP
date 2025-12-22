# Wikipedia MCP Server for Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/wikipedia-mcp-vercel)

A high-performance Model Context Protocol (MCP) server that provides comprehensive Wikipedia access for AI assistants. This TypeScript implementation is designed for deployment on Vercel and offers all the functionality of the original Python version with enhanced performance and scalability.

## Features

- 🔍 **Advanced Search**: Find Wikipedia articles with intelligent ranking
- 📄 **Full Article Access**: Retrieve complete article content with metadata
- 📝 **Smart Summaries**: Get concise, focused summaries tailored to specific queries
- 🗂️ **Section Analysis**: Extract and summarize specific article sections
- 🔗 **Link Discovery**: Find related articles and cross-references
- 🌍 **Multi-language Support**: Access Wikipedia in 50+ languages and 140+ country variants
- 📍 **Geographic Data**: Extract coordinates and location information
- 🎯 **Fact Extraction**: Intelligent extraction of key facts from articles
- ⚡ **Performance Optimized**: Caching, rate limiting, and optimized API calls
- 🔧 **Developer Friendly**: Comprehensive API and CLI tools
- 🚀 **Vercel Ready**: Optimized for serverless deployment

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

### 2. Environment Variables

Configure your deployment with these environment variables:

```env
# Wikipedia Language (default: en)
WIKIPEDIA_LANGUAGE=en

# Country/Locale for language mapping (optional)
WIKIPEDIA_COUNTRY=US

# Enable caching for better performance
ENABLE_CACHE=true

# Wikipedia API access token (optional, for rate limiting)
WIKIPEDIA_ACCESS_TOKEN=your_token_here

# Server port (Vercel will override)
PORT=8000
```

### 3. Test Your Deployment

```bash
# Health check
curl https://your-app.vercel.app/health

# MCP server info
curl https://your-app.vercel.app/mcp

# Test Wikipedia search
curl "https://your-app.vercel.app/search/artificial%20intelligence"
```

## API Documentation

### MCP Tools

The server provides 12 MCP tools for comprehensive Wikipedia access:

#### `search_wikipedia`
Search Wikipedia for articles matching a query.

```typescript
{
  "query": "artificial intelligence",
  "limit": 10
}
```

#### `get_article`
Get the full content of a Wikipedia article.

```typescript
{
  "title": "Artificial intelligence"
}
```

#### `get_summary`
Get a concise summary of a Wikipedia article.

```typescript
{
  "title": "Machine learning"
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

#### Search
```bash
GET /search/{query}?limit={number}
```

#### Articles
```bash
GET /article/{title}
GET /summary/{title}
GET /sections/{title}
GET /links/{title}
GET /coordinates/{title}
GET /related/{title}?limit={number}
```

#### Advanced Summaries
```bash
GET /summary/{title}/query/{query}/length/{maxLength}
GET /summary/{title}/section/{section}/length/{maxLength}
```

#### Facts and Diagnostics
```bash
GET /facts/{title}?topic={topic}&count={count}
GET /test-connectivity
GET /supported-countries
```

#### Tool Execution
```bash
POST /tools/{toolName}
```

### MCP Protocol Usage

For AI assistants that support MCP, configure with:

```json
{
  "mcpServers": {
    "wikipedia": {
      "command": "curl",
      "args": ["-X", "POST", "https://your-app.vercel.app/tools/{toolName}", 
               "-H", "Content-Type: application/json", 
               "-d", "{arguments}"]
    }
  }
}
```

## Multi-language Support

The server supports 50+ languages and 140+ country variants:

### By Country Code
```bash
# English (United States)
wikipedia-mcp --country US

# Chinese Simplified (China)
wikipedia-mcp --country CN

# Chinese Traditional (Taiwan)
wikipedia-mcp --country TW

# Japanese
wikipedia-mcp --country Japan
```

### By Language Code
```bash
# English
wikipedia-mcp --language en

# Japanese
wikipedia-mcp --language ja

# Chinese Simplified
wikipedia-mcp --language zh-hans

# Chinese Traditional (Taiwan)
wikipedia-mcp --language zh-tw
```

### Full Language List
Access `/supported-countries` endpoint for complete list of supported countries and languages.

## Architecture

### Components

1. **WikipediaClient**: Core Wikipedia API client with caching
2. **MCPServer**: MCP protocol implementation
3. **Express Server**: HTTP API and REST endpoints
4. **TypeScript**: Type-safe development and compilation

### Performance Features

- **Intelligent Caching**: Reduces API calls and improves response times
- **Rate Limiting**: Respects Wikipedia API limits
- **Error Handling**: Robust error handling with detailed responses
- **Connection Pooling**: Efficient HTTP connection management
- **Memory Optimization**: Optimized for serverless environments

### Security Features

- **Input Validation**: Comprehensive input sanitization
- **Rate Protection**: Built-in rate limiting
- **Error Sanitization**: No sensitive information in error messages
- **CORS Support**: Configurable cross-origin resource sharing

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
├── mcp-server.ts         # MCP protocol server
└── server.ts             # Express server and API routes
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WIKIPEDIA_LANGUAGE` | Wikipedia language code | `en` |
| `WIKIPEDIA_COUNTRY` | Country for language mapping | - |
| `ENABLE_CACHE` | Enable response caching | `false` |
| `WIKIPEDIA_ACCESS_TOKEN` | Wikipedia API access token | - |
| `PORT` | Server port | `8000` |

## Deployment

### Vercel (Recommended)

1. **One-click Deploy**: Use the deploy button above
2. **CLI Deploy**:
   ```bash
   vercel
   ```
3. **Configure Environment**: Set environment variables in Vercel dashboard

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
| Caching | Basic | Advanced |
| Rate Limiting | Basic | Advanced |

## Changelog

### v1.0.0
- Initial TypeScript implementation
- Complete MCP protocol support
- Vercel deployment optimization
- Enhanced caching and performance
- 12 MCP tools implementation
- Multi-language support (50+ languages)
- REST API endpoints
- Comprehensive documentation

---

**Built with ❤️ for the AI and developer community**

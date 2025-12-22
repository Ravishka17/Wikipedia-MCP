# AI Developer Guide: Environment Variables for Language Selection

## Quick Setup for AI Assistants

When deploying this Wikipedia MCP server for AI function calling, configure these environment variables to control which Wikipedia language edition your AI assistant accesses:

## Environment Variables

### Primary Language Control
```env
WIKIPEDIA_LANGUAGE=en  # AI sets this to: en, ja, es, de, fr, zh-hans, zh-tw, etc.
```

### AI-Friendly Country Codes
```env
WIKIPEDIA_COUNTRY=US   # Alternative: US, JP, CN, TW, DE, FR, ES, etc.
```

## AI Language Selection Examples

### For English-Speaking AI Assistants
```env
WIKIPEDIA_LANGUAGE=en
# or
WIKIPEDIA_COUNTRY=US
```

### For Japanese AI Assistants
```env
WIKIPEDIA_LANGUAGE=ja
# or  
WIKIPEDIA_COUNTRY=JP
```

### For Chinese AI Assistants
```env
# Simplified Chinese
WIKIPEDIA_LANGUAGE=zh-hans
WIKIPEDIA_COUNTRY=CN

# Traditional Chinese (Taiwan)
WIKIPEDIA_LANGUAGE=zh-tw
WIKIPEDIA_COUNTRY=TW
```

### For European AI Assistants
```env
# German
WIKIPEDIA_LANGUAGE=de
WIKIPEDIA_COUNTRY=DE

# French
WIKIPEDIA_LANGUAGE=fr
WIKIPEDIA_COUNTRY=FR

# Spanish
WIKIPEDIA_LANGUAGE=es
WIKIPEDIA_COUNTRY=ES

# Italian
WIKIPEDIA_LANGUAGE=it
WIKIPEDIA_COUNTRY=IT

# Russian
WIKIPEDIA_LANGUAGE=ru
WIKIPEDIA_COUNTRY=RU
```

## Vercel Deployment for AI

```bash
# Set environment variables for your AI deployment
vercel env add WIKIPEDIA_LANGUAGE
vercel env add WIKIPEDIA_COUNTRY
vercel env add ENABLE_CACHE

# Deploy
vercel --prod
```

## AI Assistant MCP Configuration

Configure multiple language versions for your AI assistant:

```json
{
  "mcpServers": {
    "wikipedia-en": {
      "command": "https://your-en-wikipedia.vercel.app"
    },
    "wikipedia-ja": {
      "command": "https://your-ja-wikipedia.vercel.app"
    },
    "wikipedia-zh-tw": {
      "command": "https://your-zh-tw-wikipedia.vercel.app"
    }
  }
}
```

## Testing Your AI Configuration

```bash
# Test current language setting
curl https://your-app.vercel.app/mcp

# Check supported countries
curl https://your-app.vercel.app/supported-countries

# Test search in configured language
curl "https://your-app.vercel.app/search/artificial%20intelligence"
```

## Performance Optimization for AI

```env
ENABLE_CACHE=true  # Enables caching for faster AI responses
WIKIPEDIA_ACCESS_TOKEN=your_token_here  # For high-volume AI usage
```

## Available Languages

- **European**: en, de, fr, es, it, pt, nl, pl, ru, uk
- **Asian**: ja, ko, zh-hans, zh-tw, hi, th, vi, id
- **Middle Eastern**: ar, he, fa
- **Others**: And many more...

**For the complete list, use the `/supported-countries` endpoint or the `list_supported_countries` MCP tool.**

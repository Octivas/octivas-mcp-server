# Octivas MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server that gives AI assistants the ability to scrape web pages, search the web, and crawl websites using the [Octivas API](https://octivas.com).

## Tools

| Tool | Description |
|------|-------------|
| `scrape` | Scrape a web page and extract content as markdown, HTML, structured JSON, or other formats |
| `search` | Search the web and extract full page content from results |
| `crawl` | Crawl a website from a starting URL and extract content from multiple pages |

## Setup

### Get an API key

Sign up at [octivas.com](https://octivas.com) and create an API key in [Settings](https://octivas.com/app/settings).

### Cursor

Add to your Cursor MCP config (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "octivas": {
      "command": "npx",
      "args": ["-y", "@octivas/mcp"],
      "env": {
        "OCTIVAS_API_KEY": "oc-your-api-key"
      }
    }
  }
}
```

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "octivas": {
      "command": "npx",
      "args": ["-y", "@octivas/mcp"],
      "env": {
        "OCTIVAS_API_KEY": "oc-your-api-key"
      }
    }
  }
}
```

### Windsurf

Add to your Windsurf MCP config (`~/.codeium/windsurf/mcp_config.json`):

```json
{
  "mcpServers": {
    "octivas": {
      "command": "npx",
      "args": ["-y", "@octivas/mcp"],
      "env": {
        "OCTIVAS_API_KEY": "oc-your-api-key"
      }
    }
  }
}
```

## Configuration

| Environment Variable | Required | Description |
|---------------------|----------|-------------|
| `OCTIVAS_API_KEY` | Yes | Your Octivas API key (starts with `oc-`) |
| `OCTIVAS_BASE_URL` | No | Custom API base URL (default: `https://api.octivas.com`) |

## Tool Reference

### scrape

Scrape a web page and extract its content.

**Parameters:**
- `url` (string, required) — URL of the web page to scrape
- `formats` (string[], optional) — Output formats: `markdown`, `html`, `rawHtml`, `screenshot`, `links`, `json`, `images`, `summary`. Default: `["markdown"]`
- `only_main_content` (boolean, optional) — Strip navigation, headers, footers, sidebars
- `schema` (object, optional) — JSON Schema for structured data extraction
- `prompt` (string, optional) — Natural language instructions to guide extraction

### search

Search the web and extract content from results.

**Parameters:**
- `query` (string, required) — Search query
- `limit` (number, optional) — Number of results (default: 5, max: 20)
- `formats` (string[], optional) — Content formats for each result. Default: `["markdown"]`
- `country` (string, optional) — ISO 3166-1 alpha-2 country code (e.g., `US`, `GB`)
- `tbs` (string, optional) — Time filter: `qdr:h` (hour), `qdr:d` (day), `qdr:w` (week), `qdr:m` (month), `qdr:y` (year)
- `only_main_content` (boolean, optional) — Strip non-content elements

### crawl

Crawl a website and extract content from multiple pages.

**Parameters:**
- `url` (string, required) — Starting URL
- `limit` (number, optional) — Max pages to crawl (default: 10, max: 100)
- `formats` (string[], optional) — Content formats for each page. Default: `["markdown"]`
- `max_depth` (number, optional) — Max link depth from starting URL
- `include_paths` (string[], optional) — Regex patterns for paths to include
- `exclude_paths` (string[], optional) — Regex patterns for paths to exclude
- `allow_subdomains` (boolean, optional) — Follow links to subdomains
- `only_main_content` (boolean, optional) — Strip non-content elements

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
OCTIVAS_API_KEY=oc-your-key node dist/index.js
```

## License

MIT

# @octivas/mcp

MCP (Model Context Protocol) server for web scraping, search, and crawling powered by the [Octivas](https://octivas.com).

## Quick Start

### With Cursor

Add to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "octivas": {
      "command": "npx",
      "args": ["-y", "@octivas/mcp@latest"],
      "env": {
        "OCTIVAS_API_KEY": "your-api-key"
      }
    }
  }
}
```

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "octivas": {
      "command": "npx",
      "args": ["-y", "@octivas/mcp@latest"],
      "env": {
        "OCTIVAS_API_KEY": "your-api-key"
      }
    }
  }
}
```

Get your API key at [octivas.com/app/settings](https://octivas.com/app/settings).

## Tools

### `scrape`

Extract content from a single web page. Returns markdown by default, with optional structured data extraction via JSON Schema or natural language prompts.

**Parameters:**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | Yes | URL of the page to scrape |
| `formats` | string[] | No | Output formats: `markdown`, `html`, `rawHtml`, `screenshot`, `links`, `json`, `images`, `summary` (default: `["markdown"]`) |
| `only_main_content` | boolean | No | Strip navigation, headers, footers, and sidebars |
| `schema` | object | No | JSON Schema for structured data extraction |
| `prompt` | string | No | Natural language extraction instructions (e.g., "Extract the product name and price") |

### `search`

Search the web and extract full page content from the results.

**Parameters:**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `query` | string | Yes | Search query (max 500 chars) |
| `limit` | number | No | Number of results (default: 5, max: 20) |
| `formats` | string[] | No | Content formats for each result (default: `["markdown"]`) |
| `country` | string | No | ISO 3166-1 alpha-2 country code for geo-targeted results (e.g., `US`, `GB`) |
| `tbs` | string | No | Time filter: `qdr:h` (hour), `qdr:d` (day), `qdr:w` (week), `qdr:m` (month), `qdr:y` (year) |
| `only_main_content` | boolean | No | Strip boilerplate from extracted content |

### `crawl`

Crawl a website starting from a URL and extract content from multiple pages. Useful for indexing documentation sites or gathering content across a domain.

**Parameters:**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `url` | string | Yes | Starting URL to crawl from |
| `limit` | number | No | Max pages to crawl (default: 10, max: 100) |
| `formats` | string[] | No | Content formats for each page (default: `["markdown"]`) |
| `max_depth` | number | No | Max link depth from the starting URL (0 = start page only) |
| `include_paths` | string[] | No | Regex patterns for paths to include (e.g., `["/docs/.*"]`) |
| `exclude_paths` | string[] | No | Regex patterns for paths to exclude (e.g., `["/admin/.*"]`) |
| `allow_subdomains` | boolean | No | Follow links to subdomains of the starting URL |
| `only_main_content` | boolean | No | Strip boilerplate from extracted content |

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `OCTIVAS_API_KEY` | Yes | Your Octivas API key (get one at [octivas.com/app/settings](https://octivas.com/app/settings)) |
| `OCTIVAS_BASE_URL` | No | Override the API base URL |

## Development

```bash
npm install
npm run build
npm run dev    # rebuild on changes
```

## License

MIT

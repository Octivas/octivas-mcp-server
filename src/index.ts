import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Octivas } from "@octivas/sdk";
import { registerScrape } from "./tools/scrape.js";
import { registerSearch } from "./tools/search.js";
import { registerCrawl } from "./tools/crawl.js";

const apiKey = process.env.OCTIVAS_API_KEY;
if (!apiKey) {
  process.stderr.write(
    "Error: OCTIVAS_API_KEY environment variable is required.\n" +
      "Get your API key at https://octivas.com/app/settings\n",
  );
  process.exit(1);
}

const client = new Octivas({
  apiKey,
  baseUrl: process.env.OCTIVAS_BASE_URL,
});

const server = new McpServer({
  name: "octivas",
  version: "0.1.0",
});

registerScrape(server, client);
registerSearch(server, client);
registerCrawl(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);

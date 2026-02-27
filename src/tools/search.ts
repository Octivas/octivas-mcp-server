import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Octivas, SearchResponse, ContentFormat } from "@octivas/sdk";
import { z } from "zod";

const contentFormats = z.enum([
  "markdown",
  "html",
  "rawHtml",
  "screenshot",
  "links",
  "json",
  "images",
  "summary",
]);

export function registerSearch(server: McpServer, client: Octivas) {
  server.tool(
    "search",
    "Search the web and extract content from the results. " +
      "Returns search results with their full page content in markdown by default.",
    {
      query: z
        .string()
        .min(1)
        .max(500)
        .describe("Search query (e.g., 'best practices for React testing')"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe("Number of results to return (default: 5, max: 20)"),
      formats: z
        .array(contentFormats)
        .optional()
        .describe(
          "Content formats to extract from each result (default: ['markdown'])",
        ),
      country: z
        .string()
        .length(2)
        .optional()
        .describe("ISO 3166-1 alpha-2 country code for geo-targeted results (e.g., 'US', 'GB')"),
      tbs: z
        .string()
        .optional()
        .describe(
          "Time filter: qdr:h (past hour), qdr:d (past day), qdr:w (past week), qdr:m (past month), qdr:y (past year)",
        ),
      only_main_content: z
        .boolean()
        .optional()
        .describe(
          "If true, strips navigation, headers, footers, and sidebars from extracted content",
        ),
    },
    async (params) => {
      try {
        const response = await client.search({
          query: params.query,
          limit: params.limit,
          formats: params.formats as ContentFormat[] | undefined,
          country: params.country,
          tbs: params.tbs,
          only_main_content: params.only_main_content,
        });
        return {
          content: [
            { type: "text" as const, text: formatResponse(response) },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to search "${params.query}": ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

function formatResponse(res: SearchResponse): string {
  const parts: string[] = [];

  parts.push(`# Search: ${res.query}`);
  parts.push(
    `**Results:** ${res.results_count} | **Credits used:** ${res.credits_used}`,
  );
  parts.push("");

  for (let i = 0; i < res.results.length; i++) {
    const result = res.results[i];

    const heading = result.title
      ? `${result.title} (${result.url})`
      : result.url;
    parts.push(`## ${i + 1}. ${heading}`);

    if (result.description) {
      parts.push(`> ${result.description}`);
      parts.push("");
    }

    if (result.markdown) {
      parts.push(result.markdown);
      parts.push("");
    }

    if (result.summary) {
      parts.push(`**Summary:** ${result.summary}`);
      parts.push("");
    }

    if (result.links?.length) {
      parts.push("**Links:**");
      for (const link of result.links) {
        parts.push(`- ${link}`);
      }
      parts.push("");
    }

    parts.push("---");
    parts.push("");
  }

  return parts.join("\n").trim();
}

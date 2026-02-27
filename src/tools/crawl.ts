import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Octivas, CrawlResponse, ContentFormat } from "@octivas/sdk";
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

export function registerCrawl(server: McpServer, client: Octivas) {
  server.tool(
    "crawl",
    "Crawl a website starting from a URL and extract content from multiple pages. " +
      "Useful for indexing documentation sites, sitemaps, or gathering content across a domain.",
    {
      url: z.string().url().describe("Starting URL to crawl from"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .describe("Maximum number of pages to crawl (default: 10, max: 100)"),
      formats: z
        .array(contentFormats)
        .optional()
        .describe(
          "Content formats to extract from each page (default: ['markdown'])",
        ),
      max_depth: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe("Maximum link depth from the starting URL (0 = only the start page)"),
      include_paths: z
        .array(z.string())
        .optional()
        .describe(
          "Regex patterns for paths to include (e.g., ['/docs/.*', '/blog/.*'])",
        ),
      exclude_paths: z
        .array(z.string())
        .optional()
        .describe(
          "Regex patterns for paths to exclude (e.g., ['/admin/.*', '/login'])",
        ),
      allow_subdomains: z
        .boolean()
        .optional()
        .describe("If true, follows links to subdomains of the starting URL"),
      only_main_content: z
        .boolean()
        .optional()
        .describe(
          "If true, strips navigation, headers, footers, and sidebars from extracted content",
        ),
    },
    async (params) => {
      try {
        const response = await client.crawl({
          url: params.url,
          limit: params.limit,
          formats: params.formats as ContentFormat[] | undefined,
          max_depth: params.max_depth,
          include_paths: params.include_paths,
          exclude_paths: params.exclude_paths,
          allow_subdomains: params.allow_subdomains,
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
              text: `Failed to crawl "${params.url}": ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

function formatResponse(res: CrawlResponse): string {
  const parts: string[] = [];

  parts.push(`# Crawl: ${res.url}`);
  parts.push(
    `**Pages crawled:** ${res.pages_crawled} | **Credits used:** ${res.credits_used}`,
  );
  parts.push("");

  for (let i = 0; i < res.pages.length; i++) {
    const page = res.pages[i];

    const heading = page.metadata?.title
      ? `${page.metadata.title} (${page.url})`
      : page.url;
    parts.push(`## ${i + 1}. ${heading}`);

    if (page.markdown) {
      parts.push(page.markdown);
      parts.push("");
    }

    if (page.html) {
      parts.push("### HTML Content");
      parts.push(page.html);
      parts.push("");
    }

    if (page.summary) {
      parts.push(`**Summary:** ${page.summary}`);
      parts.push("");
    }

    if (page.links?.length) {
      parts.push("### Links");
      for (const link of page.links) {
        parts.push(`- ${link}`);
      }
      parts.push("");
    }

    parts.push("---");
    parts.push("");
  }

  return parts.join("\n").trim();
}

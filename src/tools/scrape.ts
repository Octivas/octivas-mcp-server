import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Octivas, ScrapeResponse, ContentFormat } from "@octivas/sdk";
import { ForbiddenError, RateLimitError } from "@octivas/sdk";
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

export function registerScrape(server: McpServer, client: Octivas) {
  server.tool(
    "scrape",
    "Scrape a web page and extract its content. Returns markdown by default. " +
      "Can also extract structured JSON data using a schema or natural language prompt.",
    {
      url: z.string().url().describe("URL of the web page to scrape"),
      formats: z
        .array(contentFormats)
        .optional()
        .describe(
          "Output formats (default: ['markdown']). Options: markdown, html, rawHtml, screenshot, links, json, images, summary",
        ),
      only_main_content: z
        .boolean()
        .optional()
        .describe(
          "If true, strips navigation, headers, footers, and sidebars",
        ),
      schema: z
        .record(z.unknown())
        .optional()
        .describe(
          "JSON Schema for structured data extraction. The scraper extracts data matching this schema and returns it as JSON",
        ),
      prompt: z
        .string()
        .optional()
        .describe(
          "Natural language instructions to guide extraction (e.g., 'Extract the product name and price')",
        ),
    },
    async (params) => {
      try {
        const response = await client.scrape({
          url: params.url,
          formats: params.formats as ContentFormat[] | undefined,
          only_main_content: params.only_main_content,
          schema: params.schema,
          prompt: params.prompt,
        });
        return {
          content: [{ type: "text" as const, text: formatResponse(response) }],
        };
      } catch (error) {
        let message = `Failed to scrape "${params.url}": ${error instanceof Error ? error.message : String(error)}`;
        if (error instanceof ForbiddenError) {
          message = `Your subscription is inactive. Upgrade or renew your plan at ${error.upgradeUrl ?? "https://octivas.com/pricing"} to continue.`;
        } else if (error instanceof RateLimitError && error.creditsLimit != null) {
          message = `Credit limit reached (${error.creditsUsed}/${error.creditsLimit} credits used). Upgrade your plan at ${error.upgradeUrl ?? "https://octivas.com/pricing"} for more credits.`;
        }
        return {
          content: [{ type: "text" as const, text: message }],
          isError: true,
        };
      }
    },
  );
}

function formatResponse(res: ScrapeResponse): string {
  const parts: string[] = [];
  const title = res.metadata?.title ?? res.url;

  parts.push(`# ${title}`);
  parts.push(`**Source:** ${res.url}`);
  if (res.metadata?.credits_used != null) {
    parts.push(`**Credits used:** ${res.metadata.credits_used}`);
  }
  parts.push("");

  if (res.markdown) {
    parts.push(res.markdown);
    parts.push("");
  }

  if (res.html) {
    parts.push("## HTML Content");
    parts.push(res.html);
    parts.push("");
  }

  if (res.json) {
    parts.push("## Extracted Data");
    parts.push("```json");
    parts.push(JSON.stringify(res.json, null, 2));
    parts.push("```");
    parts.push("");
  }

  if (res.links?.length) {
    parts.push("## Links");
    for (const link of res.links) {
      parts.push(`- ${link}`);
    }
    parts.push("");
  }

  if (res.images?.length) {
    parts.push("## Images");
    for (const img of res.images) {
      parts.push(`- ${img}`);
    }
    parts.push("");
  }

  if (res.summary) {
    parts.push("## Summary");
    parts.push(res.summary);
    parts.push("");
  }

  if (res.screenshot) {
    parts.push(`**Screenshot:** ${res.screenshot}`);
    parts.push("");
  }

  return parts.join("\n").trim();
}

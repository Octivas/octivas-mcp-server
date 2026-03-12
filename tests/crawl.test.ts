import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, RateLimitError } from "@octivas/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Octivas, CrawlResponse } from "@octivas/sdk";
import { registerCrawl } from "../src/tools/crawl.js";

type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
}>;

function captureHandler() {
  let handler: ToolHandler | undefined;
  const server = {
    tool: (_name: string, _desc: string, _schema: unknown, fn: ToolHandler) => {
      handler = fn;
    },
  } as unknown as McpServer;
  return { server, getHandler: () => handler! };
}

function mockClient(overrides: Partial<Octivas> = {}) {
  return { crawl: vi.fn(), ...overrides } as unknown as Octivas;
}

const CRAWL_RESPONSE: CrawlResponse = {
  success: true,
  url: "https://docs.example.com",
  pages_crawled: 3,
  credits_used: 3,
  pages: [
    {
      url: "https://docs.example.com",
      markdown: "# Welcome to the docs",
      metadata: { title: "Docs Home", url: "https://docs.example.com" },
    },
    {
      url: "https://docs.example.com/guide",
      markdown: "# Getting Started Guide",
      metadata: { title: "Guide", url: "https://docs.example.com/guide" },
    },
    {
      url: "https://docs.example.com/api",
      markdown: "# API Reference",
      html: "<h1>API Reference</h1>",
      metadata: { title: "API", url: "https://docs.example.com/api" },
      links: ["https://docs.example.com/api/v1", "https://docs.example.com/api/v2"],
    },
  ],
};

describe("crawl tool", () => {
  let handler: ToolHandler;
  let client: Octivas & { crawl: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const { server, getHandler } = captureHandler();
    client = mockClient() as Octivas & { crawl: ReturnType<typeof vi.fn> };
    registerCrawl(server, client);
    handler = getHandler();
  });

  it("returns formatted crawl results on success", async () => {
    client.crawl.mockResolvedValue(CRAWL_RESPONSE);

    const result = await handler({ url: "https://docs.example.com" });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("# Crawl: https://docs.example.com");
    expect(text).toContain("**Pages crawled:** 3");
    expect(text).toContain("**Credits used:** 3");
    expect(text).toContain("## 1. Docs Home (https://docs.example.com)");
    expect(text).toContain("## 2. Guide (https://docs.example.com/guide)");
    expect(text).toContain("## 3. API (https://docs.example.com/api)");
    expect(text).toContain("# Welcome to the docs");
    expect(text).toContain("# Getting Started Guide");
  });

  it("passes all parameters to the client", async () => {
    client.crawl.mockResolvedValue(CRAWL_RESPONSE);

    await handler({
      url: "https://docs.example.com",
      limit: 50,
      formats: ["markdown", "html"],
      max_depth: 2,
      include_paths: ["/docs/.*"],
      exclude_paths: ["/admin/.*"],
      allow_subdomains: true,
      only_main_content: true,
    });

    expect(client.crawl).toHaveBeenCalledWith({
      url: "https://docs.example.com",
      limit: 50,
      formats: ["markdown", "html"],
      max_depth: 2,
      include_paths: ["/docs/.*"],
      exclude_paths: ["/admin/.*"],
      allow_subdomains: true,
      only_main_content: true,
    });
  });

  it("includes HTML content in output", async () => {
    client.crawl.mockResolvedValue(CRAWL_RESPONSE);

    const result = await handler({ url: "https://docs.example.com" });

    expect(result.content[0].text).toContain("### HTML Content");
    expect(result.content[0].text).toContain("<h1>API Reference</h1>");
  });

  it("includes links in output", async () => {
    client.crawl.mockResolvedValue(CRAWL_RESPONSE);

    const result = await handler({ url: "https://docs.example.com" });

    expect(result.content[0].text).toContain("### Links");
    expect(result.content[0].text).toContain("- https://docs.example.com/api/v1");
  });

  it("includes summary in output", async () => {
    client.crawl.mockResolvedValue({
      ...CRAWL_RESPONSE,
      pages: [
        {
          url: "https://example.com",
          summary: "A comprehensive docs site.",
        },
      ],
    });

    const result = await handler({ url: "https://example.com" });

    expect(result.content[0].text).toContain("**Summary:** A comprehensive docs site.");
  });

  it("uses URL as heading when page has no title", async () => {
    client.crawl.mockResolvedValue({
      ...CRAWL_RESPONSE,
      pages: [{ url: "https://example.com/no-title", markdown: "content" }],
    });

    const result = await handler({ url: "https://example.com" });

    expect(result.content[0].text).toContain("## 1. https://example.com/no-title");
  });

  it("handles ForbiddenError with upgradeUrl", async () => {
    client.crawl.mockRejectedValue(
      new ForbiddenError("Subscription inactive", {
        body: { detail: { upgrade_url: "https://octivas.com/pricing?plan=pro" } },
      }),
    );

    const result = await handler({ url: "https://example.com" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("subscription is inactive");
    expect(result.content[0].text).toContain("https://octivas.com/pricing?plan=pro");
  });

  it("handles ForbiddenError without upgradeUrl", async () => {
    client.crawl.mockRejectedValue(new ForbiddenError("Subscription inactive"));

    const result = await handler({ url: "https://example.com" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("subscription is inactive");
    expect(result.content[0].text).toContain("https://octivas.com/pricing");
  });

  it("handles RateLimitError with credit info and upgradeUrl", async () => {
    client.crawl.mockRejectedValue(
      new RateLimitError("Credit limit exceeded", {
        body: {
          detail: {
            credits_used: 2000,
            credits_limit: 2000,
            upgrade_url: "https://octivas.com/pricing?plan=growth",
          },
        },
      }),
    );

    const result = await handler({ url: "https://example.com" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Credit limit reached");
    expect(result.content[0].text).toContain("2000/2000");
    expect(result.content[0].text).toContain("https://octivas.com/pricing?plan=growth");
  });

  it("handles RateLimitError without upgradeUrl", async () => {
    client.crawl.mockRejectedValue(
      new RateLimitError("Credit limit exceeded", {
        body: { detail: { credits_used: 800, credits_limit: 1000 } },
      }),
    );

    const result = await handler({ url: "https://example.com" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("800/1000");
    expect(result.content[0].text).toContain("https://octivas.com/pricing");
  });

  it("handles generic errors", async () => {
    client.crawl.mockRejectedValue(new Error("Connection refused"));

    const result = await handler({ url: "https://example.com" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to crawl "https://example.com"');
    expect(result.content[0].text).toContain("Connection refused");
  });

  it("handles non-Error thrown values", async () => {
    client.crawl.mockRejectedValue("something broke");

    const result = await handler({ url: "https://example.com" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("something broke");
  });
});

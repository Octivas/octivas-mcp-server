import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, RateLimitError } from "@octivas/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Octivas, ScrapeResponse } from "@octivas/sdk";
import { registerScrape } from "../src/tools/scrape.js";

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
  return { scrape: vi.fn(), ...overrides } as unknown as Octivas;
}

const SCRAPE_RESPONSE: ScrapeResponse = {
  success: true,
  url: "https://example.com",
  markdown: "# Hello World\nSome content here.",
  metadata: { title: "Example", url: "https://example.com", credits_used: 1 },
};

describe("scrape tool", () => {
  let handler: ToolHandler;
  let client: Octivas & { scrape: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const { server, getHandler } = captureHandler();
    client = mockClient() as Octivas & { scrape: ReturnType<typeof vi.fn> };
    registerScrape(server, client);
    handler = getHandler();
  });

  it("returns formatted markdown on success", async () => {
    client.scrape.mockResolvedValue(SCRAPE_RESPONSE);

    const result = await handler({ url: "https://example.com" });

    expect(result.isError).toBeUndefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain("# Example");
    expect(result.content[0].text).toContain("**Source:** https://example.com");
    expect(result.content[0].text).toContain("**Credits used:** 1");
    expect(result.content[0].text).toContain("# Hello World");
  });

  it("passes all parameters to the client", async () => {
    client.scrape.mockResolvedValue(SCRAPE_RESPONSE);

    await handler({
      url: "https://example.com",
      formats: ["markdown", "html"],
      only_main_content: true,
      schema: { type: "object" },
      prompt: "Extract the title",
    });

    expect(client.scrape).toHaveBeenCalledWith({
      url: "https://example.com",
      formats: ["markdown", "html"],
      only_main_content: true,
      schema: { type: "object" },
      prompt: "Extract the title",
    });
  });

  it("includes extracted JSON data in output", async () => {
    client.scrape.mockResolvedValue({
      ...SCRAPE_RESPONSE,
      json: { product: "Widget", price: 9.99 },
    });

    const result = await handler({ url: "https://example.com" });

    expect(result.content[0].text).toContain("## Extracted Data");
    expect(result.content[0].text).toContain('"product": "Widget"');
  });

  it("includes links in output", async () => {
    client.scrape.mockResolvedValue({
      ...SCRAPE_RESPONSE,
      links: ["https://a.com", "https://b.com"],
    });

    const result = await handler({ url: "https://example.com" });

    expect(result.content[0].text).toContain("## Links");
    expect(result.content[0].text).toContain("- https://a.com");
  });

  it("handles ForbiddenError with upgradeUrl", async () => {
    client.scrape.mockRejectedValue(
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
    client.scrape.mockRejectedValue(new ForbiddenError("Subscription inactive"));

    const result = await handler({ url: "https://example.com" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("subscription is inactive");
    expect(result.content[0].text).toContain("https://octivas.com/pricing");
  });

  it("handles RateLimitError with credit info and upgradeUrl", async () => {
    client.scrape.mockRejectedValue(
      new RateLimitError("Credit limit exceeded", {
        body: {
          detail: {
            credits_used: 1000,
            credits_limit: 1000,
            upgrade_url: "https://octivas.com/pricing?plan=growth",
          },
        },
      }),
    );

    const result = await handler({ url: "https://example.com" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Credit limit reached");
    expect(result.content[0].text).toContain("1000/1000");
    expect(result.content[0].text).toContain("https://octivas.com/pricing?plan=growth");
  });

  it("handles RateLimitError without upgradeUrl", async () => {
    client.scrape.mockRejectedValue(
      new RateLimitError("Credit limit exceeded", {
        body: { detail: { credits_used: 500, credits_limit: 1000 } },
      }),
    );

    const result = await handler({ url: "https://example.com" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("500/1000");
    expect(result.content[0].text).toContain("https://octivas.com/pricing");
  });

  it("handles generic errors", async () => {
    client.scrape.mockRejectedValue(new Error("Network timeout"));

    const result = await handler({ url: "https://example.com" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to scrape "https://example.com"');
    expect(result.content[0].text).toContain("Network timeout");
  });

  it("handles non-Error thrown values", async () => {
    client.scrape.mockRejectedValue("something broke");

    const result = await handler({ url: "https://example.com" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("something broke");
  });
});

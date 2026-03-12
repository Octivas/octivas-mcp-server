import { describe, it, expect, vi, beforeEach } from "vitest";
import { ForbiddenError, RateLimitError } from "@octivas/sdk";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Octivas, SearchResponse } from "@octivas/sdk";
import { registerSearch } from "../src/tools/search.js";

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
  return { search: vi.fn(), ...overrides } as unknown as Octivas;
}

const SEARCH_RESPONSE: SearchResponse = {
  success: true,
  query: "vitest testing",
  results_count: 2,
  credits_used: 2,
  results: [
    {
      url: "https://vitest.dev",
      title: "Vitest",
      description: "A blazing fast unit test framework.",
      markdown: "Vitest is a Vite-native unit test framework.",
    },
    {
      url: "https://example.com/testing",
      title: "Testing Guide",
      description: "How to test your code.",
      markdown: "Learn how to test effectively.",
      links: ["https://example.com/docs"],
    },
  ],
};

describe("search tool", () => {
  let handler: ToolHandler;
  let client: Octivas & { search: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    const { server, getHandler } = captureHandler();
    client = mockClient() as Octivas & { search: ReturnType<typeof vi.fn> };
    registerSearch(server, client);
    handler = getHandler();
  });

  it("returns formatted search results on success", async () => {
    client.search.mockResolvedValue(SEARCH_RESPONSE);

    const result = await handler({ query: "vitest testing" });

    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain("# Search: vitest testing");
    expect(text).toContain("**Results:** 2");
    expect(text).toContain("**Credits used:** 2");
    expect(text).toContain("## 1. Vitest (https://vitest.dev)");
    expect(text).toContain("## 2. Testing Guide (https://example.com/testing)");
    expect(text).toContain("A blazing fast unit test framework.");
    expect(text).toContain("- https://example.com/docs");
  });

  it("passes all parameters to the client", async () => {
    client.search.mockResolvedValue(SEARCH_RESPONSE);

    await handler({
      query: "test query",
      limit: 10,
      formats: ["markdown", "summary"],
      country: "US",
      tbs: "qdr:w",
      only_main_content: true,
    });

    expect(client.search).toHaveBeenCalledWith({
      query: "test query",
      limit: 10,
      formats: ["markdown", "summary"],
      country: "US",
      tbs: "qdr:w",
      only_main_content: true,
    });
  });

  it("handles results with summary", async () => {
    client.search.mockResolvedValue({
      ...SEARCH_RESPONSE,
      results: [
        { url: "https://example.com", summary: "A brief summary of the page." },
      ],
    });

    const result = await handler({ query: "test" });

    expect(result.content[0].text).toContain("**Summary:** A brief summary of the page.");
  });

  it("handles results without title", async () => {
    client.search.mockResolvedValue({
      ...SEARCH_RESPONSE,
      results: [{ url: "https://example.com" }],
    });

    const result = await handler({ query: "test" });

    expect(result.content[0].text).toContain("## 1. https://example.com");
  });

  it("handles ForbiddenError with upgradeUrl", async () => {
    client.search.mockRejectedValue(
      new ForbiddenError("Subscription inactive", {
        body: { detail: { upgrade_url: "https://octivas.com/pricing?plan=pro" } },
      }),
    );

    const result = await handler({ query: "test" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("subscription is inactive");
    expect(result.content[0].text).toContain("https://octivas.com/pricing?plan=pro");
  });

  it("handles ForbiddenError without upgradeUrl", async () => {
    client.search.mockRejectedValue(new ForbiddenError("Subscription inactive"));

    const result = await handler({ query: "test" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("subscription is inactive");
    expect(result.content[0].text).toContain("https://octivas.com/pricing");
  });

  it("handles RateLimitError with credit info and upgradeUrl", async () => {
    client.search.mockRejectedValue(
      new RateLimitError("Credit limit exceeded", {
        body: {
          detail: {
            credits_used: 500,
            credits_limit: 500,
            upgrade_url: "https://octivas.com/pricing?plan=growth",
          },
        },
      }),
    );

    const result = await handler({ query: "test" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Credit limit reached");
    expect(result.content[0].text).toContain("500/500");
    expect(result.content[0].text).toContain("https://octivas.com/pricing?plan=growth");
  });

  it("handles RateLimitError without upgradeUrl", async () => {
    client.search.mockRejectedValue(
      new RateLimitError("Credit limit exceeded", {
        body: { detail: { credits_used: 100, credits_limit: 200 } },
      }),
    );

    const result = await handler({ query: "test" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("100/200");
    expect(result.content[0].text).toContain("https://octivas.com/pricing");
  });

  it("handles generic errors", async () => {
    client.search.mockRejectedValue(new Error("Network timeout"));

    const result = await handler({ query: "test query" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to search "test query"');
    expect(result.content[0].text).toContain("Network timeout");
  });

  it("handles non-Error thrown values", async () => {
    client.search.mockRejectedValue("something broke");

    const result = await handler({ query: "test" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("something broke");
  });
});

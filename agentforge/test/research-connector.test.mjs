import assert from "node:assert/strict";
import test from "node:test";

import {
  FetchPageReader,
  ManualSearchProvider,
  ResearchConnector,
  canonicalizeUrl,
  collectResearchSources,
  extractUrls,
  summarizeText,
} from "../src/research-connector.js";

test("extractUrls finds URLs in free text", () => {
  assert.deepEqual(extractUrls("Read https://example.com/a and http://localhost:3000/test."), [
    "https://example.com/a",
    "http://localhost:3000/test",
  ]);
});

test("canonicalizeUrl removes hash and sorts query params", () => {
  assert.equal(canonicalizeUrl("https://example.com/path?b=2&a=1#section"), "https://example.com/path?a=1&b=2");
});

test("summarizeText compacts long text", () => {
  assert.equal(summarizeText("one\n\n two   three", 80), "one two three");
  assert.equal(summarizeText("abcdef", 4), "abc...");
});

test("ManualSearchProvider combines query URLs with configured sources", async () => {
  const provider = new ManualSearchProvider([{ url: "https://example.com/docs", title: "Docs" }]);
  const sources = await provider.search("See https://example.com/blog");

  assert.equal(sources.length, 2);
  assert.equal(sources[0].url, "https://example.com/blog");
});

test("FetchPageReader extracts title and text from html", async () => {
  const reader = new FetchPageReader({
    fetchImpl: async () => ({
      ok: true,
      headers: { get: () => "text/html" },
      text: async () => "<html><title>Demo</title><body><h1>Hello</h1><script>bad()</script></body></html>",
    }),
  });

  const page = await reader.read("https://example.com");

  assert.equal(page.title, "Demo");
  assert.match(page.text, /Hello/);
  assert.doesNotMatch(page.text, /bad/);
});

test("ResearchConnector deduplicates and enriches sources", async () => {
  const connector = new ResearchConnector({
    now: () => new Date("2026-07-09T00:00:00.000Z"),
    provider: new ManualSearchProvider([
      { url: "https://example.com/path?b=2&a=1#top", title: "Example" },
      { url: "https://example.com/path?a=1&b=2", title: "Duplicate" },
    ]),
    reader: {
      read: async () => ({ title: "Fetched Title", text: "This is a fetched page body with useful context." }),
    },
  });

  const bundle = await connector.collect("demo query");

  assert.equal(bundle.sourceCount, 1);
  assert.equal(bundle.sources[0].title, "Example");
  assert.equal(bundle.sources[0].summary, "This is a fetched page body with useful context.");
  assert.equal(bundle.sources[0].fetchedAt, "2026-07-09T00:00:00.000Z");
});

test("collectResearchSources supports fetchPages=false", async () => {
  const bundle = await collectResearchSources("https://example.com/raw", {
    fetchPages: false,
    now: () => new Date("2026-07-09T00:00:00.000Z"),
  });

  assert.equal(bundle.sources[0].url, "https://example.com/raw");
  assert.equal(bundle.sources[0].summary, "");
});

const DEFAULT_USER_AGENT = "AgentForge/0.1 research connector";

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeWhitespace(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

export function canonicalizeUrl(url) {
  const parsed = new URL(url);
  parsed.hash = "";
  parsed.searchParams.sort();
  if ((parsed.protocol === "https:" && parsed.port === "443") || (parsed.protocol === "http:" && parsed.port === "80")) {
    parsed.port = "";
  }
  return parsed.toString();
}

export function extractUrls(text) {
  const matches = String(text ?? "").match(/https?:\/\/[^\s)>"']+/g) ?? [];
  return matches.map((url) => url.replace(/[.,;:!?]+$/, ""));
}

export function createSourceId(url) {
  let hash = 0;
  for (const char of canonicalizeUrl(url)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return `src-${hash.toString(16).padStart(8, "0")}`;
}

function extractTitleFromHtml(html, fallbackUrl) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return normalizeWhitespace(title?.replace(/<[^>]+>/g, "")) || fallbackUrl;
}

function htmlToText(html) {
  return normalizeWhitespace(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"'),
  );
}

export function summarizeText(text, maxLength = 280) {
  const normalized = normalizeWhitespace(text);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

export class ManualSearchProvider {
  constructor(sources = []) {
    this.sources = sources;
  }

  async search(query) {
    const queryUrls = extractUrls(query).map((url) => ({ url, title: url, snippet: "URL supplied in workflow research query." }));
    return [...queryUrls, ...this.sources].filter((source) => source?.url);
  }
}

export class FetchPageReader {
  constructor(options = {}) {
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
    this.userAgent = options.userAgent ?? DEFAULT_USER_AGENT;
  }

  async read(url) {
    if (url.startsWith("data:text/plain,")) {
      const text = decodeURIComponent(url.slice("data:text/plain,".length));
      return { title: "Inline text source", text };
    }

    if (!this.fetchImpl) {
      throw new Error("No fetch implementation available for research page reading.");
    }

    const response = await this.fetchImpl(url, { headers: { "user-agent": this.userAgent } });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    const contentType = response.headers?.get?.("content-type") ?? "";
    const body = await response.text();
    if (contentType.includes("html") || /^\s*</.test(body)) {
      return { title: extractTitleFromHtml(body, url), text: htmlToText(body) };
    }
    return { title: url, text: normalizeWhitespace(body) };
  }
}

export class ResearchConnector {
  constructor(options = {}) {
    this.provider = options.provider ?? new ManualSearchProvider(options.manualSources ?? []);
    this.reader = options.reader ?? new FetchPageReader(options);
    this.now = options.now ?? (() => new Date());
  }

  async collect(query, options = {}) {
    const rawSources = await this.provider.search(query, options);
    const seen = new Set();
    const sources = [];

    for (const rawSource of rawSources) {
      const normalized = this.normalizeCandidate(rawSource, query);
      if (!normalized || seen.has(normalized.url)) continue;
      seen.add(normalized.url);

      const enriched = options.fetchPages === false ? normalized : await this.enrich(normalized);
      sources.push(enriched);
    }

    return {
      query,
      sourceCount: sources.length,
      collectedAt: this.now().toISOString(),
      sources,
    };
  }

  normalizeCandidate(candidate, query) {
    if (typeof candidate === "string") {
      candidate = { url: candidate };
    }
    if (!isPlainObject(candidate) || !candidate.url) return undefined;

    const url = canonicalizeUrl(candidate.url);
    return {
      id: candidate.id ?? createSourceId(url),
      title: normalizeWhitespace(candidate.title) || url,
      url,
      snippet: normalizeWhitespace(candidate.snippet),
      summary: normalizeWhitespace(candidate.summary),
      usedFor: normalizeWhitespace(candidate.usedFor) || `Research for: ${query}`,
      fetchedAt: candidate.fetchedAt,
    };
  }

  async enrich(source) {
    try {
      const page = await this.reader.read(source.url);
      const summary = source.summary || summarizeText(page.text);
      return {
        ...source,
        title: source.title === source.url ? page.title : source.title,
        snippet: source.snippet || summarizeText(page.text, 160),
        summary,
        fetchedAt: this.now().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        ...source,
        summary: source.summary || `Fetch failed: ${message}`,
        fetchedAt: this.now().toISOString(),
        error: message,
      };
    }
  }
}

export async function collectResearchSources(query, options = {}) {
  const connector = new ResearchConnector(options);
  return await connector.collect(query, options);
}

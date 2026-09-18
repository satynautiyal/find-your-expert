import * as cheerio from 'cheerio';

export class ScraperHttpUtil {
  public static readonly USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
  ];

  public static getRandomUserAgent(): string {
    const idx = Math.floor(Math.random() * this.USER_AGENTS.length);
    return this.USER_AGENTS[idx];
  }

  public static getDefaultHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    return {
      'User-Agent': this.getRandomUserAgent(),
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      ...customHeaders,
    };
  }

  public static async fetchHtml(
    url: string,
    options: {
      timeoutMs?: number;
      headers?: Record<string, string>;
    } = {}
  ): Promise<string> {
    const { timeoutMs = 10000, headers } = options;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: this.getDefaultHeaders(headers),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      return await response.text();
    } finally {
      clearTimeout(timer);
    }
  }

  public static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public static cleanText(text: string): string {
    if (!text) return '';
    return text
      .replace(/\\u0026/g, '&')
      .replace(/&amp;/g, '&')
      .replace(/\\u0027/g, "'")
      .replace(/&#39;/g, "'")
      .replace(/\\u0022/g, '"')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }

  public static parseStarRating(text: string): number {
    if (!text) return 5;
    const match = text.match(/([0-9]+(?:\.[0-9]+)?)/);
    if (match) {
      const val = parseFloat(match[1]);
      if (val >= 1 && val <= 5) return Math.round(val * 10) / 10;
      if (val > 5 && val <= 50) return Math.round((val / 10) * 10) / 10;
    }
    return 5;
  }
}

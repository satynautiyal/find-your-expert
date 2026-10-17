import * as fs from 'fs';
import { launch, connect, Browser, Page } from 'puppeteer-core';

export class BrowserPoolUtil {
  /**
   * Find available system Chrome/Chromium executable
   */
  public static getChromeExecutablePath(): string {
    if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
      return process.env.PUPPETEER_EXECUTABLE_PATH;
    }

    const candidates = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/usr/lib/chromium/chromium',
      '/snap/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    }

    return process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome';
  }

  /**
   * Launch a stealth headless Chrome browser instance or connect to remote endpoint
   */
  public static async createBrowser(): Promise<Browser> {
    if (process.env.BROWSER_WS_ENDPOINT) {
      return await connect({
        browserWSEndpoint: process.env.BROWSER_WS_ENDPOINT,
      });
    }

    const executablePath = this.getChromeExecutablePath();

    return await launch({
      executablePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1280,800',
      ],
    });
  }

  /**
   * Prepare a stealth page with modern user agent and navigator overrides
   */
  public static async createStealthPage(browser: Browser): Promise<Page> {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    await page.evaluateOnNewDocument(() => {
      const nav = (globalThis as any).navigator;
      const win = globalThis as any;
      if (nav) {
        // Remove webdriver flag
        Object.defineProperty(nav, 'webdriver', { get: () => undefined });
        Object.defineProperty(nav, 'languages', { get: () => ['en-US', 'en'] });
        Object.defineProperty(nav, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      }
      if (win) {
        win.chrome = { runtime: {} };
      }
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    return page;
  }
}

import * as fs from 'fs';
import puppeteer, { Browser, Page } from 'puppeteer-core';

export class BrowserPoolUtil {
  /**
   * Find available system Chrome/Chromium executable
   */
  public static getChromeExecutablePath(): string {
    const candidates = [
      '/usr/bin/google-chrome',
      '/usr/bin/google-chrome-stable',
      '/usr/bin/chromium',
      '/usr/bin/chromium-browser',
      '/snap/bin/chromium',
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    ];

    for (const path of candidates) {
      if (fs.existsSync(path)) {
        return path;
      }
    }

    return '/usr/bin/google-chrome';
  }

  /**
   * Launch a stealth headless Chrome browser instance
   */
  public static async createBrowser(): Promise<Browser> {
    const executablePath = this.getChromeExecutablePath();

    return await puppeteer.launch({
      executablePath,
      headless: 'new' as any,
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
      // Remove webdriver flag
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      (window.navigator as any).chrome = { runtime: {} };
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );

    return page;
  }
}

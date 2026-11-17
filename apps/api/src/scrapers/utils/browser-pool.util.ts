import * as fs from 'fs';
import * as path from 'path';
import { launch, connect, Browser, Page } from 'puppeteer-core';

export class BrowserPoolUtil {
  private static sharedVisibleBrowser: Browser | null = null;

  private static readEnvValueFromDisk(key: string): string {
    if (process.env[key]) return process.env[key]!;
    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), 'apps/api/.env'),
    ];
    for (const envPath of candidates) {
      try {
        if (!fs.existsSync(envPath)) continue;
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) continue;
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx <= 0) continue;
          const k = trimmed.slice(0, eqIdx).trim();
          if (k === key) {
            return trimmed
              .slice(eqIdx + 1)
              .trim()
              .replace(/^['"`]|['"`]$/g, '');
          }
        }
      } catch {}
    }
    return '';
  }

  public static isRemoteBrowserConfigured(): boolean {
    return Boolean(
      (this.sharedVisibleBrowser && this.sharedVisibleBrowser.connected) ||
        this.readEnvValueFromDisk('BROWSER_WS_ENDPOINT') ||
        this.readEnvValueFromDisk('BROWSER_URL')
    );
  }

  /**
   * Opens a persistent visible Chrome window on the user's desktop so the user can complete
   * any interactive verification directly in the visible UI.
   */
  public static async openSharedVisibleBrowser(
    initialUrl?: string
  ): Promise<{ opened: boolean; url: string; title: string; challengeDetected: boolean }> {
    if (!this.sharedVisibleBrowser || !this.sharedVisibleBrowser.connected) {
      const executablePath = this.getChromeExecutablePath();
      const userDataDir = path.resolve(process.cwd(), '.chrome-houzz');
      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
      }
      const launched = await launch({
        executablePath,
        headless: false,
        userDataDir,
        defaultViewport: null,
        args: ['--no-first-run', '--no-default-browser-check', '--start-maximized'],
      });
      launched.on('disconnected', () => {
        if (this.sharedVisibleBrowser === launched) {
          this.sharedVisibleBrowser = null;
        }
      });
      this.sharedVisibleBrowser = launched;
    }

    let finalUrl = initialUrl || '';
    let title = '';
    let challengeDetected = false;

    if (initialUrl) {
      const pages = await this.sharedVisibleBrowser.pages();
      const page = pages[0] || (await this.sharedVisibleBrowser.newPage());
      await page.goto(initialUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await new Promise((r) => setTimeout(r, 2200));
      finalUrl = page.url();
      title = await page.title().catch(() => '');
      const bodySample = await page
        .evaluate(() => (document.body?.innerText || '').slice(0, 800).toLowerCase())
        .catch(() => '');
      challengeDetected =
        title.toLowerCase().includes('client challenge') ||
        finalUrl.toLowerCase().includes('/_fs-ch-') ||
        bodySample.includes('enter the characters seen in the image') ||
        bodySample.includes('download audio captcha');
    }

    return {
      opened: true,
      url: finalUrl,
      title,
      challengeDetected,
    };
  }

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
   * Launch a stealth headless Chrome browser instance or connect to a user-authorized remote browser
   */
  public static async createBrowser(): Promise<Browser> {
    if (this.sharedVisibleBrowser && this.sharedVisibleBrowser.connected) {
      return this.sharedVisibleBrowser;
    }

    const wsEndpoint = this.readEnvValueFromDisk('BROWSER_WS_ENDPOINT');
    if (wsEndpoint) {
      return await connect({
        browserWSEndpoint: wsEndpoint,
        defaultViewport: null,
      });
    }

    const browserUrl = this.readEnvValueFromDisk('BROWSER_URL');
    if (browserUrl) {
      return await connect({
        browserURL: browserUrl,
        defaultViewport: null,
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
   * Disconnect cleanly when attached to a user's visible browser; close when self-launched.
   */
  public static async closeBrowser(browser: Browser | null): Promise<void> {
    if (!browser) return;
    if (browser === this.sharedVisibleBrowser) {
      return;
    }
    if (this.isRemoteBrowserConfigured()) {
      try {
        await browser.disconnect();
      } catch {}
      return;
    }
    try {
      await browser.close();
    } catch {}
  }

  /**
   * Prepare a stealth page with modern user agent and navigator overrides
   */
  public static async createStealthPage(browser: Browser): Promise<Page> {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    if (!this.isRemoteBrowserConfigured()) {
      await page.evaluateOnNewDocument(() => {
        const nav = (globalThis as any).navigator;
        const win = globalThis as any;
        if (nav) {
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
    }

    return page;
  }
}

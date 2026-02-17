import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { logger } from '@/lib/logger';

/**
 * Browser automation service for job applications
 * Includes anti-detection measures and human-like behavior
 */
export class BrowserAutomation {
  private browser: Browser | null = null;

  /**
   * Launch a new browser instance with anti-detection
   */
  async launch(): Promise<BrowserContext> {
    try {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
        ],
      });

      const context = await this.browser.newContext({
        userAgent: this.getRandomUserAgent(),
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: [],
        javaScriptEnabled: true,
      });

      // Anti-detection: override navigator.webdriver and other properties
      await context.addInitScript(() => {
        // Remove webdriver property
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });

        // Override Chrome runtime
        (window as any).chrome = {
          runtime: {},
        };

        // Override plugins to look like real browser
        Object.defineProperty(navigator, 'plugins', {
          get: () => [1, 2, 3, 4, 5],
        });

        // Override languages
        Object.defineProperty(navigator, 'languages', {
          get: () => ['en-US', 'en'],
        });
      });

      logger.info('Browser launched successfully');
      return context;
    } catch (error) {
      logger.error({ error }, 'Failed to launch browser');
      throw error;
    }
  }

  /**
   * Close the browser instance
   */
  async close(): Promise<void> {
    try {
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
        logger.info('Browser closed');
      }
    } catch (error) {
      logger.error({ error }, 'Error closing browser');
    }
  }

  /**
   * Type text with human-like delays
   */
  async humanType(page: Page, selector: string, text: string): Promise<void> {
    try {
      await page.click(selector, { timeout: 10000 });
      await page.waitForTimeout(100 + Math.random() * 200);

      for (const char of text) {
        await page.keyboard.type(char, { delay: 50 + Math.random() * 100 });
      }

      logger.debug({ selector, textLength: text.length }, 'Human typed text');
    } catch (error) {
      logger.warn({ error, selector }, 'Failed to type in field');
      throw error;
    }
  }

  /**
   * Click element with human-like behavior
   */
  async humanClick(page: Page, selector: string): Promise<void> {
    try {
      const element = await page.waitForSelector(selector, { timeout: 10000 });
      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      await element.scrollIntoViewIfNeeded();
      await page.waitForTimeout(200 + Math.random() * 500);
      await element.click();

      logger.debug({ selector }, 'Human clicked element');
    } catch (error) {
      logger.warn({ error, selector }, 'Failed to click element');
      throw error;
    }
  }

  /**
   * Wait for page to stabilize
   */
  async smartWait(page: Page): Promise<void> {
    try {
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await page.waitForTimeout(500 + Math.random() * 1500);
    } catch (error) {
      // Timeout is acceptable, continue
      logger.debug('Smart wait timeout - continuing');
    }
  }

  /**
   * Take full-page screenshot
   */
  async takeScreenshot(page: Page): Promise<Buffer> {
    try {
      const screenshot = await page.screenshot({ fullPage: true });
      logger.debug('Screenshot captured');
      return screenshot;
    } catch (error) {
      logger.error({ error }, 'Failed to take screenshot');
      throw error;
    }
  }

  /**
   * Upload file to file input
   */
  async uploadFile(page: Page, selector: string, filePath: string): Promise<void> {
    try {
      const fileInput = await page.waitForSelector(selector, { timeout: 10000 });
      if (fileInput) {
        await fileInput.setInputFiles(filePath);
        logger.debug({ selector, filePath }, 'File uploaded');
      }
    } catch (error) {
      logger.warn({ error, selector }, 'Failed to upload file');
      throw error;
    }
  }

  /**
   * Select option from dropdown
   */
  async selectOption(page: Page, selector: string, value: string): Promise<void> {
    try {
      await page.selectOption(selector, { label: value }, { timeout: 10000 });
      logger.debug({ selector, value }, 'Option selected');
    } catch (error) {
      // Try by value instead
      try {
        await page.selectOption(selector, { value }, { timeout: 5000 });
        logger.debug({ selector, value }, 'Option selected by value');
      } catch {
        logger.warn({ error, selector, value }, 'Failed to select option');
        throw error;
      }
    }
  }

  /**
   * Check if element exists
   */
  async elementExists(page: Page, selector: string): Promise<boolean> {
    try {
      const element = await page.$(selector);
      return element !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get text content from element
   */
  async getText(page: Page, selector: string): Promise<string | null> {
    try {
      return await page.textContent(selector);
    } catch {
      return null;
    }
  }

  /**
   * Scroll page to simulate reading
   */
  async humanScroll(page: Page): Promise<void> {
    try {
      const scrolls = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < scrolls; i++) {
        await page.evaluate(() => {
          window.scrollBy({
            top: 300 + Math.random() * 400,
            behavior: 'smooth',
          });
        });
        await page.waitForTimeout(500 + Math.random() * 1000);
      }
    } catch (error) {
      logger.debug('Human scroll failed - continuing');
    }
  }

  /**
   * Get random user agent
   */
  private getRandomUserAgent(): string {
    const agents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ];
    return agents[Math.floor(Math.random() * agents.length)];
  }

  /**
   * Extract form HTML for AI analysis (limit size)
   */
  async extractFormHTML(page: Page, maxLength: number = 5000): Promise<string> {
    try {
      const formHTML = await page.evaluate(() => {
        const form = document.querySelector('form') ||
                     document.querySelector('[role="form"]') ||
                     document.querySelector('main') ||
                     document.body;
        return form ? form.innerHTML : '';
      });

      // Truncate if too long
      return formHTML.slice(0, maxLength);
    } catch (error) {
      logger.error({ error }, 'Failed to extract form HTML');
      return '';
    }
  }

  /**
   * Check for success indicators on page
   */
  async detectSuccess(page: Page): Promise<{ success: boolean; message: string | null }> {
    try {
      const pageText = await page.textContent('body');
      if (!pageText) {
        return { success: false, message: null };
      }

      const successPatterns = [
        /thank you/i,
        /application received/i,
        /successfully submitted/i,
        /we've received/i,
        /we have received/i,
        /application complete/i,
        /submission successful/i,
        /you're all set/i,
        /confirmation/i,
      ];

      const isSuccess = successPatterns.some(pattern => pattern.test(pageText));

      if (isSuccess) {
        // Try to extract confirmation message
        const headingSelectors = ['h1', 'h2', '.success', '.confirmation', '[role="alert"]'];
        for (const selector of headingSelectors) {
          const message = await this.getText(page, selector);
          if (message && message.length < 200) {
            return { success: true, message };
          }
        }
        return { success: true, message: 'Application submitted successfully' };
      }

      return { success: false, message: null };
    } catch (error) {
      logger.error({ error }, 'Error detecting success');
      return { success: false, message: null };
    }
  }
}

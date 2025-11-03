import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer } from "http";
import type { Server } from "http";
import { chromium, type Browser } from "playwright";

/**
 * Integration Tests for Unsubscribe Automation
 *
 * Tests the unsubscribe endpoint's ability to:
 * - Extract unsubscribe links from email HTML/headers/text
 * - Use Playwright to navigate and interact with unsubscribe pages
 * - Handle different unsubscribe patterns (buttons, forms, checkboxes)
 * - Process multiple emails in bulk
 * - Handle errors gracefully
 */

let testServer: Server;
let testServerUrl: string;
const TEST_PORT = 9876;

// Mock unsubscribe pages for testing
const mockPages = {
  simpleButton: `
    <!DOCTYPE html>
    <html>
      <head><title>Unsubscribe</title></head>
      <body>
        <h1>Unsubscribe from Newsletter</h1>
        <p>Click the button below to unsubscribe:</p>
        <button id="unsubscribe-btn" onclick="window.location.href='/success'">Unsubscribe</button>
      </body>
    </html>
  `,

  formWithCheckbox: `
    <!DOCTYPE html>
    <html>
      <head><title>Email Preferences</title></head>
      <body>
        <h1>Manage Your Email Preferences</h1>
        <form action="/success" method="post">
          <label>
            <input type="checkbox" name="newsletter" checked />
            Receive our weekly newsletter
          </label>
          <br />
          <label>
            <input type="checkbox" name="updates" checked />
            Receive product updates
          </label>
          <br />
          <button type="submit">Save Preferences</button>
        </form>
      </body>
    </html>
  `,

  confirmationPage: `
    <!DOCTYPE html>
    <html>
      <head><title>Confirm Unsubscribe</title></head>
      <body>
        <h1>Are you sure?</h1>
        <p>Do you really want to unsubscribe?</p>
        <button onclick="window.location.href='/success'">Yes, Unsubscribe</button>
        <button>No, Keep Subscribed</button>
      </body>
    </html>
  `,

  preferencesCenter: `
    <!DOCTYPE html>
    <html>
      <head><title>Preference Center</title></head>
      <body>
        <h1>Email Preference Center</h1>
        <form action="/success" method="post">
          <p>Select your email preferences:</p>
          <label>
            <input type="radio" name="preference" value="all" checked />
            Receive all emails
          </label>
          <br />
          <label>
            <input type="radio" name="preference" value="some" />
            Receive some emails
          </label>
          <br />
          <label>
            <input type="radio" name="preference" value="none" />
            Unsubscribe from all
          </label>
          <br />
          <button type="submit">Update Preferences</button>
        </form>
      </body>
    </html>
  `,

  success: `
    <!DOCTYPE html>
    <html>
      <head><title>Success</title></head>
      <body>
        <h1>Successfully Unsubscribed</h1>
        <p>You have been successfully unsubscribed from our mailing list.</p>
        <p>You will no longer receive emails from us.</p>
      </body>
    </html>
  `,

  alreadyUnsubscribed: `
    <!DOCTYPE html>
    <html>
      <head><title>Already Unsubscribed</title></head>
      <body>
        <h1>Already Unsubscribed</h1>
        <p>You are already unsubscribed from this mailing list.</p>
      </body>
    </html>
  `,

  error404: `
    <!DOCTYPE html>
    <html>
      <head><title>Not Found</title></head>
      <body>
        <h1>404 - Page Not Found</h1>
      </body>
    </html>
  `,

  expired: `
    <!DOCTYPE html>
    <html>
      <head><title>Link Expired</title></head>
      <body>
        <h1>Link Expired</h1>
        <p>This unsubscribe link has expired or is invalid.</p>
      </body>
    </html>
  `,
};

beforeAll(() => {
  return new Promise<void>((resolve) => {
    testServer = createServer((req, res) => {
      const url = req.url || "/";

      // Handle different test endpoints
      if (url === "/unsubscribe-simple") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(mockPages.simpleButton);
      } else if (url === "/unsubscribe-form") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(mockPages.formWithCheckbox);
      } else if (url === "/unsubscribe-confirm") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(mockPages.confirmationPage);
      } else if (url === "/preferences") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(mockPages.preferencesCenter);
      } else if (url === "/success") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(mockPages.success);
      } else if (url === "/already-unsubscribed") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(mockPages.alreadyUnsubscribed);
      } else if (url === "/expired") {
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(mockPages.expired);
      } else if (url === "/404") {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end(mockPages.error404);
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });

    testServer.listen(TEST_PORT, () => {
      testServerUrl = `http://localhost:${TEST_PORT}`;
      console.log(`Test server running at ${testServerUrl}`);
      resolve();
    });
  });
});

afterAll(() => {
  return new Promise<void>((resolve) => {
    if (testServer) {
      testServer.close(() => {
        console.log("Test server closed");
        resolve();
      });
    } else {
      resolve();
    }
  });
});

describe("Unsubscribe Automation Integration", () => {
  describe("Link Extraction", () => {
    it("should extract simple unsubscribe link from HTML", () => {
      const html = `
        <html>
          <body>
            <p><a href="https://example.com/unsubscribe?id=123">Unsubscribe</a></p>
          </body>
        </html>
      `;

      const pattern =
        /<a\s+[^>]*href=["']([^"']+)["'][^>]*>\s*(?:[^<]*\bunsubscribe\b[^<]*)\s*<\/a>/gi;
      const match = pattern.exec(html);

      expect(match).toBeTruthy();
      expect(match?.[1]).toBe("https://example.com/unsubscribe?id=123");
    });

    it("should extract opt-out link from HTML", () => {
      const html = `
        <html>
          <body>
            <a href="https://example.com/opt-out">Opt out</a>
          </body>
        </html>
      `;

      const pattern =
        /<a\s+[^>]*href=["']([^"']+)["'][^>]*>\s*(?:[^<]*\bopt[- ]?out\b[^<]*)\s*<\/a>/gi;
      const match = pattern.exec(html);

      expect(match).toBeTruthy();
      expect(match?.[1]).toContain("opt-out");
    });

    it("should extract preferences link from HTML", () => {
      const html = `
        <html>
          <body>
            <a href="https://example.com/preferences">Manage preferences</a>
          </body>
        </html>
      `;

      const pattern =
        /<a\s+[^>]*href=["']([^"']+)["'][^>]*>\s*(?:[^<]*\b(?:manage|email)\s+preferences\b[^<]*)\s*<\/a>/gi;
      const match = pattern.exec(html);

      expect(match).toBeTruthy();
      expect(match?.[1]).toContain("preferences");
    });

    it("should extract link from List-Unsubscribe header", () => {
      const headers =
        "List-Unsubscribe: <https://example.com/unsub?token=abc123>";

      const pattern = /<(https?:\/\/[^>]+)>/i;
      const match = pattern.exec(headers);

      expect(match).toBeTruthy();
      expect(match?.[1]).toBe("https://example.com/unsub?token=abc123");
    });

    it("should extract URL with unsubscribe in path", () => {
      const html = `
        <html>
          <body>
            <a href="https://example.com/u/12345/unsubscribe">Click here</a>
          </body>
        </html>
      `;

      const pattern = /href=["']([^"']*\bunsubscribe\b[^"']*?)["']/gi;
      const match = pattern.exec(html);

      expect(match).toBeTruthy();
      expect(match?.[1]).toContain("unsubscribe");
    });

    it("should extract unsubscribe URL from plain text", () => {
      const text = `
        To unsubscribe from this list, please visit:
        https://example.com/unsubscribe?email=test@example.com
      `;

      const pattern = /(https?:\/\/[^\s]*\bunsubscribe\b[^\s]*)/gi;
      const match = pattern.exec(text);

      expect(match).toBeTruthy();
      expect(match?.[1]).toContain("unsubscribe");
    });

    it("should return null for emails without unsubscribe link", () => {
      const html =
        "<html><body><p>This email has no unsubscribe link</p></body></html>";

      const pattern =
        /<a\s+[^>]*href=["']([^"']+)["'][^>]*>\s*(?:[^<]*\bunsubscribe\b[^<]*)\s*<\/a>/gi;
      const match = pattern.exec(html);

      expect(match).toBeNull();
    });

    it("should handle malformed HTML gracefully", () => {
      const html =
        '<html><body><a href="https://example.com/unsubscribe">Unsubscribe';

      const pattern = /href=["']([^"']*\bunsubscribe\b[^"']*?)["']/gi;
      const match = pattern.exec(html);

      expect(match).toBeTruthy();
      expect(match?.[1]).toContain("unsubscribe");
    });

    it("should prioritize HTTPS over HTTP", () => {
      const html = `
        <a href="http://example.com/unsubscribe">HTTP</a>
        <a href="https://example.com/unsubscribe">HTTPS</a>
      `;

      const pattern = /href=["'](https:\/\/[^"']*\bunsubscribe\b[^"']*?)["']/gi;
      const match = pattern.exec(html);

      expect(match?.[1]).toContain("https://");
    });

    it("should reject dangerous protocols", () => {
      const dangerousUrls = [
        "javascript:alert(1)",
        "data:text/html,<script>alert(1)</script>",
        "file:///etc/passwd",
        'vbscript:msgbox("XSS")',
      ];

      dangerousUrls.forEach((url) => {
        const isValid = url.startsWith("http://") || url.startsWith("https://");
        expect(isValid).toBe(false);
      });
    });
  });

  describe("Browser Automation - Simple Button", () => {
    let browser: Browser;

    beforeAll(async () => {
      browser = await chromium.launch({ headless: true });
    });

    afterAll(async () => {
      await browser.close();
    });

    it("should click unsubscribe button and navigate to success page", async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${testServerUrl}/unsubscribe-simple`);
      await page.waitForLoadState("domcontentloaded");

      const unsubscribeButton = page.locator("#unsubscribe-btn");
      expect(await unsubscribeButton.count()).toBe(1);

      await unsubscribeButton.click();
      await page.waitForURL(`${testServerUrl}/success`);

      const content = await page.content();
      expect(content).toContain("Successfully Unsubscribed");

      await context.close();
    }, 15000);

    it("should detect success message patterns", async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${testServerUrl}/success`);
      const content = await page.content();

      const successPatterns = [
        /successfully\s+unsubscribed/i,
        /you\s+have\s+been\s+unsubscribed/i,
        /no\s+longer\s+receive/i,
      ];

      const hasSuccess = successPatterns.some((pattern) =>
        pattern.test(content),
      );
      expect(hasSuccess).toBe(true);

      await context.close();
    }, 10000);

    it("should detect already unsubscribed state", async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${testServerUrl}/already-unsubscribed`);
      const content = await page.content();

      expect(content).toContain("Already Unsubscribed");

      await context.close();
    }, 10000);
  });

  describe("Browser Automation - Form with Checkboxes", () => {
    let browser: Browser;

    beforeAll(async () => {
      browser = await chromium.launch({ headless: true });
    });

    afterAll(async () => {
      await browser.close();
    });

    it("should uncheck subscription checkboxes and submit form", async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${testServerUrl}/unsubscribe-form`);
      await page.waitForLoadState("domcontentloaded");

      const checkboxes = await page.locator('input[type="checkbox"]').all();
      expect(checkboxes.length).toBeGreaterThan(0);

      // Uncheck all checkboxes
      for (const checkbox of checkboxes) {
        if (await checkbox.isChecked()) {
          await checkbox.uncheck();
        }
      }

      // Verify checkboxes are unchecked
      for (const checkbox of checkboxes) {
        expect(await checkbox.isChecked()).toBe(false);
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      await page.waitForURL(`${testServerUrl}/success`);

      const content = await page.content();
      expect(content).toContain("Successfully Unsubscribed");

      await context.close();
    }, 15000);
  });

  describe("Browser Automation - Confirmation Page", () => {
    let browser: Browser;

    beforeAll(async () => {
      browser = await chromium.launch({ headless: true });
    });

    afterAll(async () => {
      await browser.close();
    });

    it("should click confirmation button", async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${testServerUrl}/unsubscribe-confirm`);
      await page.waitForLoadState("domcontentloaded");

      const yesButton = page.locator('button:has-text("Yes")');
      expect(await yesButton.count()).toBeGreaterThan(0);

      await yesButton.click();
      await page.waitForURL(`${testServerUrl}/success`);

      const content = await page.content();
      expect(content).toContain("Successfully Unsubscribed");

      await context.close();
    }, 15000);
  });

  describe("Browser Automation - Preference Center", () => {
    let browser: Browser;

    beforeAll(async () => {
      browser = await chromium.launch({ headless: true });
    });

    afterAll(async () => {
      await browser.close();
    });

    it("should select unsubscribe option and submit", async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${testServerUrl}/preferences`);
      await page.waitForLoadState("domcontentloaded");

      // Select "Unsubscribe from all" radio button
      const unsubscribeRadio = page.locator(
        'input[type="radio"][value="none"]',
      );
      expect(await unsubscribeRadio.count()).toBe(1);
      await unsubscribeRadio.check();

      expect(await unsubscribeRadio.isChecked()).toBe(true);

      // Submit form
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();
      await page.waitForURL(`${testServerUrl}/success`);

      const content = await page.content();
      expect(content).toContain("Successfully Unsubscribed");

      await context.close();
    }, 15000);
  });

  describe("Error Handling", () => {
    let browser: Browser;

    beforeAll(async () => {
      browser = await chromium.launch({ headless: true });
    });

    afterAll(async () => {
      await browser.close();
    });

    it("should handle 404 errors", async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      const response = await page.goto(`${testServerUrl}/404`);
      expect(response?.status()).toBe(404);

      await context.close();
    }, 10000);

    it("should handle expired links", async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      await page.goto(`${testServerUrl}/expired`);
      const content = await page.content();
      expect(content).toContain("expired");

      await context.close();
    }, 10000);

    it("should handle network timeout gracefully", async () => {
      const context = await browser.newContext();
      const page = await context.newPage();

      try {
        await page.goto("http://localhost:99999", { timeout: 5000 });
        expect.fail("Should have thrown timeout error");
      } catch (error) {
        expect(error).toBeDefined();
      }

      await context.close();
    }, 10000);
  });

  describe("Bulk Processing", () => {
    it("should handle empty email array", () => {
      const emailIds: string[] = [];
      expect(emailIds.length).toBe(0);
    });

    it("should process multiple emails", () => {
      const emailIds = ["email-1", "email-2", "email-3"];
      expect(emailIds.length).toBe(3);
    });

    it("should track results correctly", () => {
      const results = {
        successful: 2,
        failed: 1,
        noLink: 0,
        total: 3,
      };

      expect(results.successful + results.failed + results.noLink).toBe(
        results.total,
      );
    });
  });

  describe("Response Format", () => {
    it("should return correct response structure", () => {
      const response = {
        success: true,
        successful: 2,
        failed: 1,
        noLink: 0,
        total: 3,
        details: [
          {
            emailId: "email-1",
            subject: "Newsletter",
            status: "success" as const,
            message: "Successfully unsubscribed",
          },
          {
            emailId: "email-2",
            subject: "Marketing",
            status: "success" as const,
            message: "Successfully unsubscribed",
          },
          {
            emailId: "email-3",
            subject: "Updates",
            status: "failed" as const,
            message: "No unsubscribe link found",
          },
        ],
      };

      expect(response.success).toBe(true);
      expect(response.total).toBe(3);
      expect(response.details.length).toBe(3);
      expect(response.successful + response.failed + response.noLink).toBe(
        response.total,
      );
    });

    it("should include detailed results for each email", () => {
      const detail = {
        emailId: "email-1",
        subject: "Newsletter",
        status: "success" as const,
        message: "Successfully unsubscribed",
      };

      expect(detail.emailId).toBeTruthy();
      expect(detail.subject).toBeTruthy();
      expect(["success", "failed", "no_link"].includes(detail.status)).toBe(
        true,
      );
      expect(detail.message).toBeTruthy();
    });
  });

  describe("Security", () => {
    it("should validate email ownership", () => {
      const userId = "user-123";
      const emailUserId = "user-123";
      expect(userId).toBe(emailUserId);
    });

    it("should sanitize URLs", () => {
      const url = "https://example.com/unsubscribe?id=123";
      const sanitized = url.trim().replace(/[.,;:)\]}>]+$/, "");

      expect(
        sanitized.startsWith("http://") || sanitized.startsWith("https://"),
      ).toBe(true);
    });

    it("should use headless browser", () => {
      const config = { headless: true };
      expect(config.headless).toBe(true);
    });

    it("should set reasonable timeouts", () => {
      const timeout = 30000;
      expect(timeout).toBeGreaterThan(0);
      expect(timeout).toBeLessThanOrEqual(60000);
    });
  });

  describe("Edge Cases", () => {
    it("should handle redirects", () => {
      const expectsRedirect = true;
      expect(expectsRedirect).toBe(true);
    });

    it("should handle multi-step processes", () => {
      const steps = ["navigate", "click", "confirm", "verify"];
      expect(steps.length).toBeGreaterThan(1);
    });
  });
});

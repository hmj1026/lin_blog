import { test, expect } from "@playwright/test";

test.describe("Analytics scripts", () => {
  test("injects GA, GTM, and FB Pixel when ids are set", async ({ page }) => {
    await page.route("https://www.googletagmanager.com/**", (route) => route.abort());
    await page.route("https://connect.facebook.net/**", (route) => route.abort());

    await page.goto("/");

    await expect(page.locator("script#_next-ga")).toHaveAttribute(
      "src",
      /gtag\/js\?id=G-TEST123/
    );
    await expect(page.locator("script#_next-gtm")).toHaveAttribute(
      "src",
      /gtm\.js\?id=GTM-TEST123/
    );
    await expect(page.locator("script#fb-pixel")).toHaveCount(1);
  });
});

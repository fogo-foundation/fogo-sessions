import { exec } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import puppeteer from "puppeteer";

const ONE_SECOND_IN_MS = 1000;

const TEST_DIR = path.join(
  path.dirname(import.meta.url),
  "__fixtures__",
  "test-package",
);
const TEST_DIR_PATH = fileURLToPath(TEST_DIR);

const execAsync = promisify(exec);

describe("integration", () => {
  it(
    "installs & works",
    async () => {
      await execAsync("pnpm exec webpack --mode production", {
        cwd: TEST_DIR_PATH,
      });

      const browser = await puppeteer.launch();
      const page = await browser.newPage();
      await page.goto(path.join(TEST_DIR, "index.html"));
      const content = await page.content();

      await Promise.all([
        browser.close(),
        rm(path.join(TEST_DIR_PATH, "dist"), { recursive: true }),
      ]);

      expect(content).toMatchSnapshot();
    },
    240 * ONE_SECOND_IN_MS,
  );
});

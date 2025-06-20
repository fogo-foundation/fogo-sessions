import { exec, spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import puppeteer from "puppeteer";

const ONE_SECOND_IN_MS = 1000;
const NEXT_PORT = 5000;

const TEST_DIR = path.join(
  path.dirname(import.meta.url),
  "__fixtures__",
  "test-app",
);
const TEST_DIR_PATH = fileURLToPath(TEST_DIR);

const execAsync = promisify(exec);

describe("integration", () => {
  it(
    "installs & works",
    async () => {
      const { page, closeApp } = await runTestApp(NEXT_PORT);

      const textSelector = await page
        .locator("text/Hello, World!")
        .waitHandle();
      const content = await textSelector.evaluate((el) => el.outerHTML);

      await closeApp();

      expect(content).toMatchSnapshot();
    },
    240 * ONE_SECOND_IN_MS,
  );
});

const runTestApp = async (port: number) => {
  await execAsync("pnpm i", { cwd: TEST_DIR_PATH });
  await execAsync("pnpm exec next build", {
    cwd: TEST_DIR_PATH,
  });
  const next = await runNext(port);

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port.toString()}`);

  return {
    page,
    closeApp: async () => {
      next.kill();
      return Promise.all([
        browser.close(),
        rm(path.join(TEST_DIR_PATH, ".next"), { recursive: true }),
        rm(path.join(TEST_DIR_PATH, "node_modules"), { recursive: true }),
      ]);
    },
  };
};

const runNext = (port: number) => {
  const controller = new AbortController();
  const nextServerController = {
    kill: () => {
      controller.abort();
    },
  };
  let out = "";
  const nextServer = spawn(
    "pnpm",
    ["exec", "next", "start", "--port", port.toString()],
    {
      cwd: TEST_DIR_PATH,
      signal: controller.signal,
    },
  );
  return new Promise<typeof nextServerController>((resolve, reject) => {
    nextServer.stdout.on("data", (data: Buffer | string) => {
      out += data.toString();
      if (out.includes(" ✓ Ready in")) {
        resolve(nextServerController);
      }
    });
    nextServer.on("error", (err) => {
      reject(err);
    });
  });
};

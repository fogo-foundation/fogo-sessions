import { exec } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const ONE_SECOND_IN_MS = 1000;

const TEST_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "__fixtures__",
  "test-package",
);

const execAsync = promisify(exec);

describe("integration", () => {
  it(
    "installs & works",
    async () => {
      const { stdout } = await execAsync("node ./index.js", {
        cwd: TEST_DIR,
        env: { ...process.env, FORCE_COLOR: "0" },
      });
      expect(stdout).toMatchSnapshot();
    },
    240 * ONE_SECOND_IN_MS,
  );
});

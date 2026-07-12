import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const REPOSITORY_ROOT = path.resolve(__dirname, "../../../..");
const CONTRACT_CHECKER = path.join(REPOSITORY_ROOT, "scripts/verify-runtime-contract.sh");
const CONTRACT_FILES = [
  ".github/workflows/ci.yml",
  ".github/workflows/e2e.yml",
  "web/Dockerfile",
] as const;

/** Creates an isolated copy of every file inspected by the contract checker. */
const createContractFixture = () => {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "runtime-contract-"));

  for (const relativePath of CONTRACT_FILES) {
    const fixturePath = path.join(fixtureRoot, relativePath);
    mkdirSync(path.dirname(fixturePath), { recursive: true });
    writeFileSync(
      fixturePath,
      readFileSync(path.join(REPOSITORY_ROOT, relativePath), "utf8")
    );
  }

  return fixtureRoot;
};

/** Runs the real repository contract checker against the requested root. */
const runContractChecker = (contractRoot = REPOSITORY_ROOT) =>
  spawnSync("bash", [CONTRACT_CHECKER, contractRoot], {
    cwd: REPOSITORY_ROOT,
    encoding: "utf8",
  });

describe("CI runtime build environment contract", () => {
  it("keeps required server environment variables aligned across build surfaces", () => {
    const result = runContractChecker();

    expect(result.status, `${result.stdout}${result.stderr}`).toBe(0);
  });

  it("runs the contract checker from the CI detect gate", () => {
    const workflow = readFileSync(
      path.join(REPOSITORY_ROOT, ".github/workflows/ci.yml"),
      "utf8"
    );
    const detectJob =
      workflow.match(/^  detect:\n[\s\S]*?(?=^  [A-Za-z0-9_-]+:\n)/m)?.[0] ??
      "";

    expect(detectJob).toContain("bash scripts/verify-runtime-contract.sh");
  });

  it("rejects an empty required environment variable", () => {
    const fixtureRoot = createContractFixture();

    try {
      const e2eWorkflowPath = path.join(
        fixtureRoot,
        ".github/workflows/e2e.yml"
      );
      const e2eWorkflow = readFileSync(e2eWorkflowPath, "utf8").replace(
        /^      CRON_SECRET:.*$/m,
        "      CRON_SECRET:"
      );
      writeFileSync(e2eWorkflowPath, e2eWorkflow);

      const result = runContractChecker(fixtureRoot);

      expect(result.status, `${result.stdout}${result.stderr}`).toBe(1);
      expect(result.stdout).toContain(
        "E2E job 缺少必要 build environment variable：CRON_SECRET"
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects a required variable declared outside the CI build step", () => {
    const fixtureRoot = createContractFixture();

    try {
      const ciWorkflowPath = path.join(
        fixtureRoot,
        ".github/workflows/ci.yml"
      );
      const ciWorkflow = readFileSync(ciWorkflowPath, "utf8")
        .replace(/^          CRON_SECRET:.*$/m, "")
        .concat(
          "\n  unrelated-job:\n    env:\n      CRON_SECRET: wrong-scope-placeholder\n"
        );
      writeFileSync(ciWorkflowPath, ciWorkflow);

      const result = runContractChecker(fixtureRoot);

      expect(result.status, `${result.stdout}${result.stderr}`).toBe(1);
      expect(result.stdout).toContain(
        "CI build job 缺少必要 build environment variable：CRON_SECRET"
      );
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects a quoted empty workflow environment variable", () => {
    const fixtureRoot = createContractFixture();

    try {
      const e2eWorkflowPath = path.join(
        fixtureRoot,
        ".github/workflows/e2e.yml"
      );
      const e2eWorkflow = readFileSync(e2eWorkflowPath, "utf8").replace(
        /^      CRON_SECRET:.*$/m,
        '      CRON_SECRET: ""'
      );
      writeFileSync(e2eWorkflowPath, e2eWorkflow);

      const result = runContractChecker(fixtureRoot);

      expect(result.status, `${result.stdout}${result.stderr}`).toBe(1);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects a quoted empty Docker build argument", () => {
    const fixtureRoot = createContractFixture();

    try {
      const dockerfilePath = path.join(fixtureRoot, "web/Dockerfile");
      const dockerfile = readFileSync(dockerfilePath, "utf8").replace(
        /^ARG CRON_SECRET=.*$/m,
        'ARG CRON_SECRET=""'
      );
      writeFileSync(dockerfilePath, dockerfile);

      const result = runContractChecker(fixtureRoot);

      expect(result.status, `${result.stdout}${result.stderr}`).toBe(1);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects Docker forwarding under the wrong environment name", () => {
    const fixtureRoot = createContractFixture();

    try {
      const dockerfilePath = path.join(fixtureRoot, "web/Dockerfile");
      const dockerfile = readFileSync(dockerfilePath, "utf8").replace(
        "    CRON_SECRET=$CRON_SECRET \\",
        "    NOT_CRON_SECRET=$CRON_SECRET \\"
      );
      writeFileSync(dockerfilePath, dockerfile);

      const result = runContractChecker(fixtureRoot);

      expect(result.status, `${result.stdout}${result.stderr}`).toBe(1);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});

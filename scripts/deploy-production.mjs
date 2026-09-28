import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const config = JSON.parse(readFileSync(join(root, "release.config.json"), "utf8"));
const run = (command, args, cwd = root) => execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "inherit"] }).trim();
const expectedRemote = `https://github.com/${config.repository}.git`;
if (run("git", ["remote", "get-url", "origin"]) !== expectedRemote) throw new Error("Origin must match release.config.json.");
if (run("git", ["status", "--porcelain"])) throw new Error("Commit and push local changes before releasing.");
run("git", ["fetch", "origin", "main"]);
const sha = run("git", ["rev-parse", "HEAD"]);
if (sha !== run("git", ["rev-parse", "origin/main"])) throw new Error("HEAD must equal the main commit already on GitHub.");
const checks = JSON.parse(run("gh", ["run", "list", "--repo", config.repository, "--commit", sha, "--event", "push", "--limit", "50", "--json", "status,conclusion,workflowName"]));
if (!checks.length || checks.some(check => check.status !== "completed" || check.conclusion !== "success")) {
  throw new Error("Wait for all GitHub push checks on this commit to pass before releasing.");
}
console.log(`Verified GitHub source: ${config.repository}@${sha}`);
if (process.argv.includes("--check")) process.exit(0);
const temporary = mkdtempSync(join(tmpdir(), "github-release-"));
try {
  const checkout = resolve(temporary, "source");
  run("git", ["clone", "--single-branch", "--branch", "main", expectedRemote, checkout], temporary);
  if (run("git", ["rev-parse", "HEAD"], checkout) !== sha) throw new Error("GitHub main changed during release; run the checks again.");
  mkdirSync(join(checkout, ".vercel"));
  writeFileSync(join(checkout, ".vercel", "project.json"), JSON.stringify({ projectId: config.projectId, orgId: config.teamId, projectName: config.projectName }));
  const result = spawnSync("npx", ["--yes", "vercel@60.1.3", "deploy", "--prod", "--yes"], { cwd: checkout, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Deployment failed (${result.status}).`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

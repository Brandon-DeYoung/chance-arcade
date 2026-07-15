import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const [major, minor] = process.versions.node.split(".").map(Number);

if (major < 22 || (major === 22 && minor < 13)) {
  console.error(`\nNode.js 22.13.0 or newer is required. You have ${process.version}.`);
  console.error("Install the current Node.js LTS release from https://nodejs.org and try again.\n");
  process.exit(1);
}

function run(args) {
  const result = spawnSync(npm, args, { cwd: root, env: process.env, stdio: "inherit" });
  if (result.error) {
    console.error(`Could not run npm: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const installed = existsSync(join(root, "node_modules", "vite", "bin", "vite.js"))
  && existsSync(join(root, "node_modules", "react", "package.json"));

if (!installed) {
  console.log("\nFirst launch: installing the project dependencies…\n");
  run(["ci"]);
}

console.log("\nBuilding the local presentation app…\n");
run(["run", "build"]);

console.log("\nStarting Chance Arcade at http://127.0.0.1:4173");
console.log("Press Ctrl+C in this window when you are finished.\n");
run(["run", "preview", "--", "--port", "4173", "--strictPort"]);

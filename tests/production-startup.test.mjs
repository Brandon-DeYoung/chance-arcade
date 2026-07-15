import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("production preview starts and serves the application", { timeout: 15_000 }, async (context) => {
  const port = 43_000 + process.pid % 1_000;
  const vite = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));
  const child = spawn(process.execPath, [vite, "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    stdio: ["ignore", "pipe", "pipe"],
  });
  context.after(() => child.kill("SIGTERM"));
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });
  for (let attempt = 0; attempt < 50 && !output.includes("http://127.0.0.1"); attempt += 1) {
    if (child.exitCode !== null) assert.fail(`Preview exited early.\n${output}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  const response = await fetch(`http://127.0.0.1:${port}/`);
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Chance Arcade/);
  child.kill("SIGTERM");
  await once(child, "exit");
});

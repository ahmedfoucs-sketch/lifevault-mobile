import { execFileSync } from "node:child_process";
import { rmSync, mkdirSync } from "node:fs";

const out = ".test-dist";
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

execFileSync("npx", [
  "tsc",
  "src/crypto/lv-crypto.ts",
  "src/services/memory-engine.ts",
  "--target", "ES2022",
  "--module", "ES2022",
  "--lib", "ES2022,DOM",
  "--outDir", out,
  "--skipLibCheck"
], { stdio: "inherit" });

try {
  execFileSync(process.execPath, ["--test", "tests/unit"], { stdio: "inherit" });
} finally {
  rmSync(out, { recursive: true, force: true });
}

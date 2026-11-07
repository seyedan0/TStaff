#!/usr/bin/env node

/**
 * TStaff Automated Security & Secret Leakage Audit
 * Checks for hardcoded credentials, boundary violations, and fail-closed security rules.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { execSync } from "node:child_process";

const SUSPICIOUS_PATTERNS = [
  /sk-[a-zA-Z0-9]{20,}/,
  /ghp_[a-zA-Z0-9]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /(?:password|secret|apikey)\s*=\s*['"][a-zA-Z0-9!@#$%^&*()_+]{8,}['"]/i,
];

const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  ".system_generated",
  "brain",
]);

let violations = 0;

function scanDirectory(dir) {
  const entries = readdirSync(dir);
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (
      stat.isFile() &&
      (fullPath.endsWith(".ts") ||
        fullPath.endsWith(".js") ||
        fullPath.endsWith(".json") ||
        fullPath.endsWith(".mjs") ||
        fullPath.endsWith(".env"))
    ) {
      if (fullPath.includes(".env.example")) continue;
      const content = readFileSync(fullPath, "utf-8");
      for (const pattern of SUSPICIOUS_PATTERNS) {
        if (pattern.test(content)) {
          // Allow mock test passwords in test files
          if (
            (fullPath.includes(".test.") || fullPath.includes(".spec.")) &&
            !pattern.source.includes("PRIVATE KEY")
          ) {
            continue;
          }
          console.error(
            `❌ Security Violation: Suspicious pattern found in ${fullPath}`,
          );
          violations++;
        }
      }
    }
  }
}

console.log("🔒 Running Automated Security & Secret Leakage Audit for TStaff...");
scanDirectory(process.cwd());

if (violations === 0) {
  console.log("✅ Secret Scanning: No hardcoded secrets or private keys detected.");
} else {
  console.error(`❌ Secret Scanning Failed: Found ${violations} suspicious secret(s).`);
  process.exit(1);
}

// Architecture Boundary Verification
console.log("📐 Verifying Modular Monolith Boundaries...");
try {
  execSync("node scripts/check-boundaries.mjs", { stdio: "inherit" });
  console.log("✅ Architecture Boundary Checks: PASSED.");
} catch (err) {
  console.error("❌ Architecture Boundary Checks Failed.");
  process.exit(1);
}

console.log("🛡️ Security & Boundary Audit COMPLETED SUCCESSFULLY!");


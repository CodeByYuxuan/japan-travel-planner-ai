import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "..");
const scanRoots = [
  resolve(repositoryRoot, "apps/web/src"),
  resolve(repositoryRoot, "apps/web/dist")
];
const serverSecretNames = [
  "DATABASE_URL",
  "GOOGLE_MAPS_API_KEY",
  "JWT_SECRET",
  "OPENAI_API_KEY",
  "RAKUTEN_ACCESS_KEY",
  "RAKUTEN_API_KEY",
  "RAKUTEN_APP_ID",
  "WEATHER_API_KEY"
];
const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".map",
  ".mjs",
  ".ts",
  ".tsx"
]);
const suspiciousPatterns = [
  {
    label: "OpenAI-style API key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{16,}\b/
  },
  {
    label: "credential-bearing PostgreSQL URL",
    pattern: /\bpostgres(?:ql)?:\/\/[^:\s/]+:[^@\s/]+@/i
  },
  {
    label: "server provider variable exposed with a Vite prefix",
    pattern:
      /\bVITE_(?:DATABASE_URL|GOOGLE_MAPS_API_KEY|JWT_SECRET|OPENAI_API_KEY|RAKUTEN_(?:ACCESS_KEY|API_KEY|APP_ID)|WEATHER_API_KEY)\b/
  }
];

const files = (
  await Promise.all(scanRoots.map((root) => collectTextFiles(root)))
).flat();
const configuredSecrets = serverSecretNames
  .map((name) => ({
    name,
    value: process.env[name]?.trim()
  }))
  .filter((secret) => secret.value !== undefined && secret.value.length >= 8);
const findings = [];

for (const file of files) {
  const contents = await readFile(file, "utf8");
  const displayPath = relative(repositoryRoot, file);

  for (const name of serverSecretNames) {
    if (contents.includes(name)) {
      findings.push(`${displayPath}: contains server-only variable ${name}`);
    }
  }

  for (const { label, pattern } of suspiciousPatterns) {
    if (pattern.test(contents)) {
      findings.push(`${displayPath}: contains ${label}`);
    }
  }

  for (const secret of configuredSecrets) {
    if (contents.includes(secret.value)) {
      findings.push(
        `${displayPath}: contains configured value for ${secret.name}`
      );
    }
  }
}

if (findings.length > 0) {
  console.error("Client secret exposure check failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exitCode = 1;
} else {
  console.log(
    `Client secret exposure check passed across ${files.length} source and bundle files.`
  );
}

async function collectTextFiles(directory) {
  const directoryStats = await stat(directory).catch(() => null);

  if (directoryStats === null || !directoryStats.isDirectory()) {
    throw new Error(
      `Required scan directory is missing: ${relative(repositoryRoot, directory)}`
    );
  }

  const entries = await readdir(directory);
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry);
      const entryStats = await stat(path);

      if (entryStats.isDirectory()) {
        return collectTextFiles(path);
      }

      return textExtensions.has(extname(entry)) ? [path] : [];
    })
  );

  return nestedFiles.flat();
}

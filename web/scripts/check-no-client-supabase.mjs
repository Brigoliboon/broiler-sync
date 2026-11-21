import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const requireBundle = process.argv.includes("--bundle");
const errors = [];

const SOURCE_DIRS = ["app", "components", "lib", "hooks", "src"].filter((dir) =>
  fs.existsSync(path.join(root, dir)),
);

const FORBIDDEN_SPECIFIERS = [
  /^@supabase\//,
  /supabase-browser$/,
  /^@\/lib\/supabase(?:\/|$)/,
  /^@\/lib\/db(?:\/|$)/,
];

const FORBIDDEN_TEXT = [
  "NEXT_PUBLIC_SUPABASE_",
  "createBrowserClient",
  "supabase.co",
];

const IMPORT_FROM_RE =
  /(?:^|\n)\s*(?:import|export)(\s+type)?\s+[\s\S]*?from\s*["']([^"']+)["']/g;
const SIDE_EFFECT_IMPORT_RE = /(?:^|\n)\s*import\s*["']([^"']+)["']/g;
const DYNAMIC_IMPORT_RE = /import\(\s*["']([^"']+)["']\s*\)/g;

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts|jsx|js|mjs|cjs)$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function hasUseDirective(source, directive) {
  const trimmed = stripComments(source).trimStart();
  return (
    trimmed.startsWith(`"${directive}"`) || trimmed.startsWith(`'${directive}'`)
  );
}

function resolveImport(fromFile, specifier) {
  if (specifier.startsWith("@/")) {
    return resolveExisting(path.join(root, specifier.slice(2)));
  }
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return resolveExisting(path.resolve(path.dirname(fromFile), specifier));
  }
  return null;
}

function resolveExisting(base) {
  const candidates = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.js`,
    `${base}.jsx`,
    `${base}.mjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? null;
}

function parseValueImports(source) {
  const specifiers = new Set();
  const uncommented = stripComments(source);
  for (const match of uncommented.matchAll(IMPORT_FROM_RE)) {
    if (match[1]) continue; // import type / export type
    specifiers.add(match[2]);
  }
  for (const match of uncommented.matchAll(SIDE_EFFECT_IMPORT_RE)) {
    specifiers.add(match[1]);
  }
  for (const match of uncommented.matchAll(DYNAMIC_IMPORT_RE)) {
    specifiers.add(match[1]);
  }
  return [...specifiers];
}

function rel(file) {
  return path.relative(root, file);
}

const bannedBrowserClient = ["lib/supabase-browser.ts", "lib/supabase-browser.tsx"]
  .map((file) => path.join(root, file))
  .filter((file) => fs.existsSync(file));
for (const file of bannedBrowserClient) {
  errors.push(`${rel(file)} must not exist; browser code must not create a Supabase client`);
}

const files = SOURCE_DIRS.flatMap((dir) => walk(path.join(root, dir)));
const clientEntries = files.filter((file) =>
  hasUseDirective(fs.readFileSync(file, "utf8"), "use client"),
);

const visited = new Set();
const queue = [...clientEntries];

while (queue.length > 0) {
  const file = queue.pop();
  if (visited.has(file)) continue;
  visited.add(file);
  const source = fs.readFileSync(file, "utf8");
  if (hasUseDirective(source, "use server")) continue;

  for (const needle of FORBIDDEN_TEXT) {
    if (source.includes(needle)) {
      errors.push(`${rel(file)} contains ${needle}`);
    }
  }

  if (source.includes('import "server-only"') || source.includes("import 'server-only'")) {
    errors.push(`${rel(file)} is in the client graph but imports server-only`);
  }

  for (const specifier of parseValueImports(source)) {
    if (FORBIDDEN_SPECIFIERS.some((pattern) => pattern.test(specifier))) {
      errors.push(`${rel(file)} imports ${specifier}`);
      continue;
    }
    const resolved = resolveImport(file, specifier);
    if (resolved) queue.push(resolved);
  }
}

const staticDir = path.join(root, ".next/static");
if (requireBundle && !fs.existsSync(staticDir)) {
  errors.push("missing .next/static; run this check after next build");
} else if (fs.existsSync(staticDir)) {
  const bundleNeedles = ["supabase.co", "supabase-js", "createBrowserClient", "NEXT_PUBLIC_SUPABASE_"];
  const bundleFiles = walk(staticDir).filter((file) => /\.(js|css|map)$/.test(file));
  for (const file of bundleFiles) {
    const source = fs.readFileSync(file, "utf8");
    for (const needle of bundleNeedles) {
      if (source.includes(needle)) {
        errors.push(`client bundle ${path.relative(root, file)} contains ${needle}`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error("Client Supabase check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Client Supabase check passed (${clientEntries.length} client entries, ${visited.size} modules${fs.existsSync(staticDir) ? ", bundle scanned" : ""}).`,
);

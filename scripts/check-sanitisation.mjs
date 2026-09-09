import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const roots = [
  "src",
  "public",
  "docs",
  ".github",
  "README.md",
  "AGENTS.md",
  "PRODUCT.md",
  "DESIGN.md",
  ".impeccable",
  "tests",
  "scripts",
  "package.json",
  "package-lock.json",
  "next.config.ts",
  "vercel.json",
  "out",
];
const patterns = [
  ["former organisation name", new RegExp(["gm", "cu"].join(""), "i")],
  [
    "former regional identifier",
    new RegExp(
      [
        ["Shep", "parton"].join(""),
        ["Goul", "burn"].join(""),
        ["Moor", "oopna"].join(""),
        ["Kya", "bram"].join(""),
      ].join("|"),
      "i",
    ),
  ],
  [
    "private infrastructure hostname",
    /(?:azurecontainerapps\.io|postgres\.database\.azure\.com|vault\.azure\.net)/i,
  ],
  ["database connection string", /postgres(?:ql)?:\/\//i],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  [
    "credential token",
    /(?:ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|sk-[A-Za-z0-9]{32,})/,
  ],
];
const sourcePatterns = [
  [
    "server-only dependency",
    /(?:from\s+["']|import\s*\(["'])(?:@prisma\/client|@azure\/msal-node|server-only|next\/(?:headers|server)|@\/lib\/(?:db|auth|env)|@\/generated)/,
  ],
  ["server action", /["']use server["']/],
  [
    "legacy runtime environment",
    /(?:DATABASE_URL|AUTH_MODE|ENTRA_CLIENT_SECRET|NEXT_SERVER_ACTIONS_ENCRYPTION_KEY)/,
  ],
];
let failures = 0,
  checked = 0;
const manifest = JSON.parse(await readFile("package.json", "utf8"));
for (const dependency of Object.keys({
  ...manifest.dependencies,
  ...manifest.devDependencies,
})) {
  if (
    /^(?:@supabase\/|@prisma\/|prisma$|@azure\/|next-auth$|@auth\/|@sentry\/|pg$)/.test(
      dependency,
    )
  ) {
    process.stderr.write(`Forbidden dependency: ${dependency}\n`);
    failures++;
  }
}
async function scan(file) {
  let info;
  try {
    info = await stat(file);
  } catch {
    return;
  }
  if (info.isDirectory()) {
    for (const entry of await readdir(file)) await scan(path.join(file, entry));
    return;
  }
  if (!/\.(?:tsx?|jsx?|mjs|json|md|html|css|txt|svg|ya?ml)$/.test(file)) return;
  const content = await readFile(file, "utf8");
  checked++;
  for (const [label, pattern] of [
    ...patterns,
    ...(file.startsWith("src/") ? sourcePatterns : []),
  ]) {
    if (pattern.test(content)) {
      process.stderr.write(`${label}: ${file}\n`);
      failures++;
    }
  }
}
for (const root of roots) await scan(root);
for (const directory of [
  "src/app/api",
  "src/app/admin",
  "src/app/login",
  "prisma",
  "infra",
]) {
  try {
    await stat(directory);
    process.stderr.write(`Excluded directory present: ${directory}\n`);
    failures++;
  } catch {
    /* absent is expected */
  }
}
if (failures) {
  process.stderr.write(`${failures} sanitisation findings.\n`);
  process.exit(1);
}
process.stdout.write(
  `Sanitisation passed across ${checked} source and build files.\n`,
);

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

export function findGitignore(cwd: string = process.cwd()): string | undefined {
  let dir = cwd;
  while (true) {
    const candidate = join(dir, ".gitignore");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return undefined;
}

export async function addGitignoreEntries(
  entries: string[],
  options?: { cwd?: string; createIfNotExists?: boolean }
): Promise<string | undefined> {
  const cwd = options?.cwd ?? process.cwd();
  const createIfNotExists = options?.createIfNotExists !== false;

  const normalized = [...new Set(entries.map((e) => e.trim()).filter(Boolean))];
  if (normalized.length === 0) {
    return undefined;
  }

  let gitignorePath = findGitignore(cwd);

  if (!gitignorePath) {
    if (!createIfNotExists) {
      return undefined;
    }
    gitignorePath = join(cwd, ".gitignore");
    await writeFile(gitignorePath, `${normalized.join("\n")}\n`);
    return gitignorePath;
  }

  const existing = await readFile(gitignorePath, "utf-8");
  const existingLines = new Set(existing.split("\n").map((l) => l.trim()));
  const newEntries = normalized.filter((e) => !existingLines.has(e));

  if (newEntries.length === 0) {
    return undefined;
  }

  const prefix = existing.endsWith("\n") ? "" : "\n";
  await writeFile(
    gitignorePath,
    `${existing}${prefix}${newEntries.join("\n")}\n`
  );

  return gitignorePath;
}

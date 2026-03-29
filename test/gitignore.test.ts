import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { addGitignoreEntries, findGitignore } from "../src/utils/gitignore.ts";

describe("findGitignore", () => {
  const testDir = join(import.meta.dirname, ".tmp-gitignore");

  it("finds .gitignore in current directory", async () => {
    const dir = join(testDir, "gi-current");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, ".gitignore"), "node_modules\n");

    const result = findGitignore(dir);
    expect(result).toBe(join(dir, ".gitignore"));

    await rm(testDir, { recursive: true, force: true });
  });

  it("finds .gitignore in parent directory", async () => {
    const parent = join(testDir, "gi-parent");
    const child = join(parent, "child");
    await mkdir(child, { recursive: true });
    await writeFile(join(parent, ".gitignore"), "node_modules\n");

    const result = findGitignore(child);
    expect(result).toBe(join(parent, ".gitignore"));

    await rm(testDir, { recursive: true, force: true });
  });

  it("returns undefined when not found", () => {
    const result = findGitignore("/");
    expect(result).toBeUndefined();
  });
});

describe("addGitignoreEntries", () => {
  const testDir = join(import.meta.dirname, ".tmp-gitignore");

  it("creates .gitignore if it does not exist", async () => {
    // Use /tmp to avoid finding the project's .gitignore via traversal
    const dir = join("/tmp", ".sf-test-gi-create");
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });

    const result = await addGitignoreEntries([".claude/skills"], { cwd: dir });
    expect(result).toBe(join(dir, ".gitignore"));

    const content = await readFile(join(dir, ".gitignore"), "utf-8");
    expect(content).toBe(".claude/skills\n");

    await rm(dir, { recursive: true, force: true });
  });

  it("returns undefined for empty entries", async () => {
    const result = await addGitignoreEntries([]);
    expect(result).toBeUndefined();
  });

  it("appends entries to existing .gitignore", async () => {
    const dir = join(testDir, "gi-append");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, ".gitignore"), "node_modules\n");

    const result = await addGitignoreEntries([".claude/skills"], { cwd: dir });

    expect(result).toBe(join(dir, ".gitignore"));
    const content = await readFile(join(dir, ".gitignore"), "utf-8");
    expect(content).toBe("node_modules\n.claude/skills\n");

    await rm(testDir, { recursive: true, force: true });
  });

  it("does not add duplicate entries and returns undefined", async () => {
    const dir = join(testDir, "gi-dedup");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, ".gitignore"), ".claude/skills\n");

    const result = await addGitignoreEntries([".claude/skills"], { cwd: dir });

    expect(result).toBeUndefined();
    const content = await readFile(join(dir, ".gitignore"), "utf-8");
    expect(content).toBe(".claude/skills\n");

    await rm(testDir, { recursive: true, force: true });
  });

  it("adds multiple entries at once", async () => {
    const dir = join(testDir, "gi-multi");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, ".gitignore"), "node_modules\n");

    await addGitignoreEntries([".claude/skills", ".agents/skills"], {
      cwd: dir,
    });

    const content = await readFile(join(dir, ".gitignore"), "utf-8");
    expect(content).toBe("node_modules\n.claude/skills\n.agents/skills\n");

    await rm(testDir, { recursive: true, force: true });
  });

  it("skips creation when createIfNotExists is false", async () => {
    // Use /tmp to avoid finding the project's .gitignore via traversal
    const dir = join("/tmp", ".sf-test-gi-no-create");
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });

    const result = await addGitignoreEntries([".claude/skills"], {
      cwd: dir,
      createIfNotExists: false,
    });
    expect(result).toBeUndefined();

    await rm(dir, { recursive: true, force: true });
  });

  it("handles file not ending with newline", async () => {
    const dir = join(testDir, "gi-no-newline");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, ".gitignore"), "node_modules");

    await addGitignoreEntries([".claude/skills"], { cwd: dir });

    const content = await readFile(join(dir, ".gitignore"), "utf-8");
    expect(content).toBe("node_modules\n.claude/skills\n");

    await rm(testDir, { recursive: true, force: true });
  });

  it("only appends entries not already present (partial overlap)", async () => {
    const dir = join(testDir, "gi-partial");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, ".gitignore"), "node_modules\n.claude/skills\n");

    const result = await addGitignoreEntries(
      [".claude/skills", ".agents/skills"],
      { cwd: dir }
    );

    expect(result).toBe(join(dir, ".gitignore"));
    const content = await readFile(join(dir, ".gitignore"), "utf-8");
    expect(content).toBe("node_modules\n.claude/skills\n.agents/skills\n");

    await rm(testDir, { recursive: true, force: true });
  });

  it("deduplicates input entries", async () => {
    const dir = join(testDir, "gi-input-dedup");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, ".gitignore"), "node_modules\n");

    await addGitignoreEntries(
      [".claude/skills", ".claude/skills", ".agents/skills"],
      { cwd: dir }
    );

    const content = await readFile(join(dir, ".gitignore"), "utf-8");
    expect(content).toBe("node_modules\n.claude/skills\n.agents/skills\n");

    await rm(testDir, { recursive: true, force: true });
  });
});

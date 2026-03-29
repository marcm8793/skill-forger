import { mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { findSkillsBinary, findSkillsDirs } from "../src/skills.ts";

const SKILLS_BIN_RE = /node_modules[/\\]\.bin[/\\]skills$/;

describe("findSkillsBinary", () => {
  it("finds skills binary in node_modules", () => {
    const binary = findSkillsBinary({ cache: false });
    expect(binary).toBeDefined();
    expect(binary).toMatch(SKILLS_BIN_RE);
  });
});

describe("findSkillsDirs", () => {
  const testDir = join(import.meta.dirname, ".tmp-skills");

  it("finds directories containing a skills subdirectory", async () => {
    const dir = join(testDir, "skills-dirs");
    await mkdir(join(dir, ".claude", "skills"), { recursive: true });
    await mkdir(join(dir, ".agents", "skills"), { recursive: true });
    await mkdir(join(dir, "no-skills-here"), { recursive: true });

    const result = findSkillsDirs(dir);
    expect(result).toContain(".claude/skills");
    expect(result).toContain(".agents/skills");
    expect(result).not.toContain("no-skills-here");

    await rm(testDir, { recursive: true, force: true });
  });

  it("returns empty array when no skill directories exist", async () => {
    const dir = join(testDir, "no-skills");
    await mkdir(dir, { recursive: true });

    const result = findSkillsDirs(dir);
    expect(result).toEqual([]);

    await rm(testDir, { recursive: true, force: true });
  });
});

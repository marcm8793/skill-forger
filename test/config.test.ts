import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findSkillsConfig,
  readSkillsConfig,
  removeSkill,
} from "../src/config.ts";

describe("findSkillsConfig", () => {
  const testDir = join(import.meta.dirname, ".tmp-config");

  it("finds skills.json in current directory", async () => {
    const dir = join(testDir, "current");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "skills.json"), JSON.stringify({ skills: [] }));

    const result = await findSkillsConfig(dir);
    expect(result).toBe(join(dir, "skills.json"));

    await rm(testDir, { recursive: true, force: true });
  });

  it("finds skills.json in parent directory", async () => {
    const parent = join(testDir, "parent");
    const child = join(parent, "child");
    await mkdir(child, { recursive: true });
    await writeFile(
      join(parent, "skills.json"),
      JSON.stringify({ skills: [] })
    );

    const result = await findSkillsConfig(child);
    expect(result).toBe(join(parent, "skills.json"));

    await rm(testDir, { recursive: true, force: true });
  });

  it("returns undefined when not found", async () => {
    const result = await findSkillsConfig("/");
    expect(result).toBeUndefined();
  });
});

describe("readSkillsConfig", () => {
  const testDir = join(import.meta.dirname, ".tmp-config");

  it("reads and parses skills.json", async () => {
    const dir = join(testDir, "read");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "skills.json"),
      JSON.stringify({ skills: [{ source: "test", skills: ["a"] }] })
    );

    const { config, path } = await readSkillsConfig({ cwd: dir });
    expect(config.skills).toHaveLength(1);
    expect(config.skills[0]?.source).toBe("test");
    expect(path).toBe(join(dir, "skills.json"));

    await rm(testDir, { recursive: true, force: true });
  });

  it("throws when skills.json not found", async () => {
    await expect(readSkillsConfig({ cwd: "/" })).rejects.toThrow(
      "skills.json not found"
    );
  });
});

describe("removeSkill", () => {
  const testDir = join(import.meta.dirname, ".tmp-config");

  it("removes entire source from config", async () => {
    const dir = join(testDir, "remove-source");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "skills.json"),
      JSON.stringify({ skills: [{ source: "owner/repo", skills: ["pdf"] }] })
    );

    const { config } = await removeSkill("owner/repo", [], { cwd: dir });
    expect(config.skills).toHaveLength(0);

    await rm(testDir, { recursive: true, force: true });
  });

  it("removes specific skills from source", async () => {
    const dir = join(testDir, "remove-skills");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "skills.json"),
      JSON.stringify({
        skills: [{ source: "owner/repo", skills: ["pdf", "commit", "review"] }],
      })
    );

    const { config } = await removeSkill("owner/repo", ["pdf", "commit"], {
      cwd: dir,
    });
    expect(config.skills).toHaveLength(1);
    expect(config.skills[0]?.skills).toEqual(["review"]);

    await rm(testDir, { recursive: true, force: true });
  });

  it("removes source when all its skills are removed", async () => {
    const dir = join(testDir, "remove-all-skills");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "skills.json"),
      JSON.stringify({
        skills: [{ source: "owner/repo", skills: ["pdf"] }],
      })
    );

    const { config } = await removeSkill("owner/repo", ["pdf"], { cwd: dir });
    expect(config.skills).toHaveLength(0);

    await rm(testDir, { recursive: true, force: true });
  });

  it("throws for unknown source", async () => {
    const dir = join(testDir, "remove-unknown");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "skills.json"),
      JSON.stringify({ skills: [{ source: "owner/repo", skills: [] }] })
    );

    await expect(
      removeSkill("unknown/source", [], { cwd: dir })
    ).rejects.toThrow('Source "unknown/source" not found');

    await rm(testDir, { recursive: true, force: true });
  });

  it("throws when selectively removing from all-skills source", async () => {
    const dir = join(testDir, "remove-from-all");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "skills.json"),
      JSON.stringify({ skills: [{ source: "owner/repo", skills: [] }] })
    );

    await expect(
      removeSkill("owner/repo", ["pdf"], { cwd: dir })
    ).rejects.toThrow("installs all skills");

    await rm(testDir, { recursive: true, force: true });
  });

  it("preserves other sources when removing one", async () => {
    const dir = join(testDir, "remove-preserve");
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, "skills.json"),
      JSON.stringify({
        skills: [
          { source: "org/repo-a", skills: ["pdf"] },
          { source: "org/repo-b", skills: ["commit"] },
        ],
      })
    );

    const { config } = await removeSkill("org/repo-a", [], { cwd: dir });
    expect(config.skills).toHaveLength(1);
    expect(config.skills[0]?.source).toBe("org/repo-b");

    await rm(testDir, { recursive: true, force: true });
  });
});

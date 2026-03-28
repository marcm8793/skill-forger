import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseSource } from "../src/cli.ts";
import { findSkillsConfig, readSkillsConfig } from "../src/config.ts";
import {
  findSkillsBinary,
  getSkillsDir,
  getSkillsDirs,
} from "../src/skills.ts";
import { addGitignoreEntries, findGitignore } from "../src/utils/gitignore.ts";

const SKILLS_BIN_RE = /node_modules[/\\]\.bin[/\\]skills$/;

describe("findSkillsConfig", () => {
  const testDir = join(import.meta.dirname, ".tmp");

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
  const testDir = join(import.meta.dirname, ".tmp");

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

describe("findSkillsBinary", () => {
  it("finds skills binary in node_modules", () => {
    const binary = findSkillsBinary({ cache: false });
    expect(binary).toBeDefined();
    expect(binary).toMatch(SKILLS_BIN_RE);
  });
});

describe("parseSource", () => {
  it("parses colon-separated format", () => {
    expect(parseSource("owner/repo")).toEqual({
      source: "owner/repo",
      skills: [],
    });
    expect(parseSource("owner/repo:pdf")).toEqual({
      source: "owner/repo",
      skills: ["pdf"],
    });
    expect(parseSource("owner/repo:pdf:commit")).toEqual({
      source: "owner/repo",
      skills: ["pdf", "commit"],
    });
  });

  it("treats * as all skills", () => {
    expect(parseSource("owner/repo:*")).toEqual({
      source: "owner/repo",
      skills: [],
    });
    expect(parseSource("owner/repo:pdf:*")).toEqual({
      source: "owner/repo",
      skills: [],
    });
  });

  it("parses skills.sh URLs", () => {
    expect(parseSource("https://skills.sh/vercel-labs/skills")).toEqual({
      source: "vercel-labs/skills",
      skills: [],
    });
    expect(
      parseSource(
        "https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices"
      )
    ).toEqual({
      source: "vercel-labs/agent-skills",
      skills: ["vercel-react-best-practices"],
    });
    expect(parseSource("https://skills.sh/owner/repo/skill1/skill2")).toEqual({
      source: "owner/repo",
      skills: ["skill1", "skill2"],
    });
  });

  it("handles http:// URLs", () => {
    expect(parseSource("http://skills.sh/owner/repo/skill")).toEqual({
      source: "owner/repo",
      skills: ["skill"],
    });
  });

  it("handles URLs without protocol", () => {
    expect(parseSource("skills.sh/owner/repo/skill")).toEqual({
      source: "owner/repo",
      skills: ["skill"],
    });
    expect(parseSource("skills.sh/vercel-labs/skills")).toEqual({
      source: "vercel-labs/skills",
      skills: [],
    });
  });

  it("returns raw input for invalid skills.sh URLs", () => {
    // Only namespace, no repo - returns as source with empty skills
    expect(parseSource("https://skills.sh/owner")).toEqual({
      source: "https://skills.sh/owner",
      skills: [],
    });
    expect(parseSource("skills.sh/owner")).toEqual({
      source: "skills.sh/owner",
      skills: [],
    });
  });
});

describe("getSkillsDir", () => {
  it("maps claude-code to .claude/skills", () => {
    expect(getSkillsDir("claude-code")).toBe(".claude/skills");
  });

  it("maps shared-directory agents to .agents/skills", () => {
    expect(getSkillsDir("cursor")).toBe(".agents/skills");
    expect(getSkillsDir("codex")).toBe(".agents/skills");
    expect(getSkillsDir("github-copilot")).toBe(".agents/skills");
    expect(getSkillsDir("gemini-cli")).toBe(".agents/skills");
  });

  it("maps agents with non-standard directory names", () => {
    expect(getSkillsDir("kilo")).toBe(".kilocode/skills");
    expect(getSkillsDir("droid")).toBe(".factory/skills");
    expect(getSkillsDir("openclaw")).toBe("skills");
    expect(getSkillsDir("mistral-vibe")).toBe(".vibe/skills");
  });

  it("falls back to .<agent>/skills for unknown agents", () => {
    expect(getSkillsDir("windsurf")).toBe(".windsurf/skills");
    expect(getSkillsDir("roo")).toBe(".roo/skills");
    expect(getSkillsDir("unknown-agent")).toBe(".unknown-agent/skills");
  });
});

describe("getSkillsDirs", () => {
  it("deduplicates directories", () => {
    expect(getSkillsDirs(["cursor", "codex"])).toEqual([".agents/skills"]);
  });

  it("returns unique directories for mixed agents", () => {
    const dirs = getSkillsDirs(["claude-code", "cursor"]);
    expect(dirs).toContain(".claude/skills");
    expect(dirs).toContain(".agents/skills");
    expect(dirs).toHaveLength(2);
  });
});

describe("findGitignore", () => {
  const testDir = join(import.meta.dirname, ".tmp");

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
  const testDir = join(import.meta.dirname, ".tmp");

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

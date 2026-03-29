import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

export interface SkillsConfig {
  $schema?: string;
  skills: SkillSource[];
}

export interface SkillSource {
  skills?: string[];
  source: string;
}

export interface SkillsConfigResult {
  config: SkillsConfig;
  path: string;
}

export function findSkillsConfig(
  cwd: string = process.cwd()
): string | undefined {
  let dir = resolve(cwd);
  const root = dirname(dir);

  while (dir !== root) {
    const candidate = join(dir, "skills.json");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  // Check root as well
  const rootCandidate = join(dir, "skills.json");
  if (existsSync(rootCandidate)) {
    return rootCandidate;
  }

  return undefined;
}

export interface ReadSkillsConfigOptions {
  createIfNotExists?: boolean;
  cwd?: string;
}

function defaultConfig(): SkillsConfig {
  return { skills: [] };
}

export async function readSkillsConfig(
  options: ReadSkillsConfigOptions = {}
): Promise<SkillsConfigResult> {
  const { cwd, createIfNotExists = false } = options;
  const skillsPath = findSkillsConfig(cwd);

  if (!skillsPath) {
    if (createIfNotExists) {
      const newPath = join(resolve(cwd ?? process.cwd()), "skills.json");
      const config = defaultConfig();
      await writeFile(newPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
      return { config, path: newPath };
    }
    throw new Error(
      "skills.json not found in current directory or any parent directory."
    );
  }

  const raw = await readFile(skillsPath, "utf8");
  const parsed = JSON.parse(raw) as unknown;
  return { config: assertSkillsConfig(parsed), path: skillsPath };
}

export interface UpdateSkillsConfigOptions {
  createIfNotExists?: boolean;
  cwd?: string;
}

export async function updateSkillsConfig(
  updater: (
    config: SkillsConfig
  ) => undefined | SkillsConfig | Promise<undefined | SkillsConfig>,
  options: UpdateSkillsConfigOptions = {}
): Promise<SkillsConfigResult> {
  const { cwd, createIfNotExists = true } = options;
  const { config, path } = await readSkillsConfig({ cwd, createIfNotExists });
  const updated = (await updater(config)) ?? config;
  const validated = assertSkillsConfig(updated);

  await writeFile(path, `${JSON.stringify(validated, null, 2)}\n`, "utf8");
  return { config: validated, path };
}

export interface AddSkillOptions {
  createIfNotExists?: boolean;
  cwd?: string;
}

export interface RemoveSkillOptions {
  cwd?: string;
}

export function addSkill(
  source: string,
  skills: string[] = [],
  options: AddSkillOptions = {}
): Promise<SkillsConfigResult> {
  return updateSkillsConfig((config) => {
    const entry = config.skills.find((item) => item.source === source);

    if (!entry) {
      config.skills.push({ source, skills: [...skills] });
      return config;
    }

    // Empty skills means "all skills" - if either side is empty, result is all
    if (skills.length === 0 || !entry.skills?.length) {
      entry.skills = [];
      return config;
    }

    // Merge specific skills
    const merged = new Set(entry.skills);
    for (const skill of skills) {
      merged.add(skill);
    }
    entry.skills = [...merged];

    return config;
  }, options);
}

export function removeSkill(
  source: string,
  skills: string[] = [],
  options: RemoveSkillOptions = {}
): Promise<SkillsConfigResult> {
  return updateSkillsConfig(
    (config) => {
      const entryIndex = config.skills.findIndex(
        (item) => item.source === source
      );
      if (entryIndex === -1) {
        throw new Error(`Source "${source}" not found in skills.json.`);
      }

      const entry = config.skills[entryIndex];
      if (!entry) {
        throw new Error(`Source "${source}" not found in skills.json.`);
      }

      // No specific skills = remove entire source
      if (skills.length === 0) {
        config.skills.splice(entryIndex, 1);
        return config;
      }

      // Source installs all skills — can't selectively remove
      if (!entry.skills?.length) {
        throw new Error(
          `Source "${source}" installs all skills. Remove the entire source: sf uninstall ${source}`
        );
      }

      // Remove specific skills
      entry.skills = entry.skills.filter((s) => !skills.includes(s));

      // If no skills remain, remove the entire entry
      if (entry.skills.length === 0) {
        config.skills.splice(entryIndex, 1);
      }

      return config;
    },
    { cwd: options.cwd, createIfNotExists: false }
  );
}

function assertSkillsConfig(value: unknown): SkillsConfig {
  if (!value || typeof value !== "object" || !("skills" in value)) {
    throw new Error("Invalid skills.json: missing 'skills' key.");
  }

  if (!("$schema" in value)) {
    const result = {
      $schema: "https://unpkg.com/skill-forger/skills_schema.json",
      ...(value as SkillsConfig),
    };
    return result;
  }

  return value as SkillsConfig;
}

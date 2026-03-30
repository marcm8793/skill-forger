#!/usr/bin/env node

import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import {
  addSkill,
  findSkillsConfig,
  readSkillsConfig,
  removeSkill,
  removeSkillsLockEntries,
} from "./config.ts";
import {
  findSkillsDirs,
  installSkillSource,
  installSkills,
  uninstallSkillSource,
} from "./skills.ts";
import { c } from "./utils/colors.ts";
import { addGitignoreEntries } from "./utils/gitignore.ts";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };
const name = "skill-forger";

const SKILLS_SH_RE = /^(?:https?:\/\/)?skills\.sh\/(.+)/;
const GITHUB_RE =
  /^https?:\/\/github\.com\/([^/]+\/[^/]+)\/tree\/[^/]+\/skills\/(.+)/;

export function parseSource(input: string): {
  source: string;
  skills: string[];
} {
  // Handle skills.sh URLs: https://skills.sh/owner/repo/skill-name or skills.sh/owner/repo/skill-name
  const skillsShMatch = input.match(SKILLS_SH_RE)?.[1];
  if (skillsShMatch) {
    const [namespace, repo, ...skills] = skillsShMatch.split("/");
    if (!(namespace && repo)) {
      return { source: input, skills: [] };
    }
    const filtered = skills
      .flatMap((s) => s.split(","))
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      source: `${namespace}/${repo}`,
      skills: filtered.includes("*") ? [] : filtered,
    };
  }

  // Handle GitHub URLs: https://github.com/owner/repo/tree/branch/skills/skill-name
  const githubMatch = input.match(GITHUB_RE);
  if (githubMatch) {
    const [, ownerRepo = "", skillPath = ""] = githubMatch;
    const skills = skillPath
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);
    return {
      source: ownerRepo,
      skills: skills.includes("*") ? [] : skills,
    };
  }

  const [source = "", ...parts] = input.split(":");
  // Support both colon and comma separators: source:skill1,skill2:skill3
  const skills = parts
    .flatMap((p) => p.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
  return { source, skills: skills.includes("*") ? [] : skills };
}

interface CommandValues {
  agent?: string[];
  gitignore?: boolean;
  global?: boolean;
}

async function updateGitignore(values: CommandValues): Promise<void> {
  if (!values.gitignore || values.global) {
    return;
  }
  const dirs = findSkillsDirs();
  if (dirs.length === 0) {
    return;
  }
  const result = await addGitignoreEntries(dirs);
  if (result) {
    console.log(
      `${c.green}✔${c.reset} Added ${c.cyan}${dirs.join(", ")}${c.reset} to .gitignore`
    );
  }
}

async function handleInstall(values: CommandValues): Promise<void> {
  const skillsConfigPath = findSkillsConfig();
  if (!skillsConfigPath) {
    console.log(`${c.yellow}No skills.json found.${c.reset}

Get started by adding a skill source:

${c.dim}$${c.reset} npx ${name} add ${c.cyan}vercel-labs/skills${c.reset}
`);
    return;
  }
  await installSkills({
    yes: true,
    agents: values.agent || ["claude-code"],
    global: values.global,
  });
  await updateGitignore(values);
}

async function handleAdd(
  positionals: string[],
  values: CommandValues
): Promise<void> {
  const sources = positionals.slice(1);
  if (sources.length === 0) {
    showUsage("add");
    throw new Error("Missing skill source.");
  }

  const parsedSources: { source: string; skills: string[] }[] = [];
  for (const rawSource of sources) {
    const { source, skills } = parseSource(rawSource);
    const existing = parsedSources.find((p) => p.source === source);
    if (existing) {
      if (skills.length === 0 || existing.skills.length === 0) {
        existing.skills = [];
      } else {
        existing.skills = [...new Set([...existing.skills, ...skills])];
      }
    } else {
      parsedSources.push({ source, skills: [...skills] });
    }
  }

  const agents = values.agent || ["claude-code"];
  const globalPrefix = values.global ? `${c.magenta}[ global ]${c.reset} ` : "";

  let addIdx = 0;
  for (const entry of parsedSources) {
    if (addIdx++ > 0) {
      console.log();
    }
    await installSkillSource(
      { source: entry.source, skills: entry.skills },
      { agents, yes: true, global: values.global }
    );
    await addSkill(entry.source, entry.skills);
    console.log(
      `${globalPrefix}${c.green}✔${c.reset} Added ${c.cyan}${entry.source}${c.reset} to skills.json`
    );
  }

  await updateGitignore(values);
}

async function handleUninstall(
  positionals: string[],
  values: CommandValues
): Promise<void> {
  const sources = positionals.slice(1);
  if (sources.length === 0) {
    showUsage("uninstall");
    throw new Error("Missing skill source.");
  }

  const parsedSources: { source: string; skills: string[] }[] = [];
  for (const rawSource of sources) {
    const { source, skills } = parseSource(rawSource);
    const existing = parsedSources.find((p) => p.source === source);
    if (existing) {
      if (skills.length === 0 || existing.skills.length === 0) {
        existing.skills = [];
      } else {
        existing.skills = [...new Set([...existing.skills, ...skills])];
      }
    } else {
      parsedSources.push({ source, skills: [...skills] });
    }
  }

  const agents = values.agent || ["claude-code"];
  const globalPrefix = values.global ? `${c.magenta}[ global ]${c.reset} ` : "";

  let rmIdx = 0;
  for (const parsed of parsedSources) {
    if (rmIdx++ > 0) {
      console.log();
    }
    // Determine which skills to remove from disk
    let diskSkills = parsed.skills;
    if (parsed.skills.length === 0) {
      const { config } = await readSkillsConfig();
      const entry = config.skills.find((s) => s.source === parsed.source);
      if (entry?.skills?.length) {
        diskSkills = entry.skills;
      }
    }

    await uninstallSkillSource(
      { source: parsed.source, skills: diskSkills },
      { agents, yes: true, global: values.global }
    );
    await removeSkill(parsed.source, parsed.skills);
    await removeSkillsLockEntries(parsed.source, diskSkills);
    console.log(
      `${globalPrefix}${c.green}✔${c.reset} Removed ${c.cyan}${parsed.source}${c.reset} from skills.json`
    );
  }
}

export async function main(
  argv: string[] = process.argv.slice(2)
): Promise<void> {
  // Expand --gi alias to --gitignore before parsing
  const normalizedArgv = argv.map((arg) =>
    arg === "--gi" ? "--gitignore" : arg
  );

  const { values, positionals } = parseArgs({
    args: normalizedArgv,
    allowPositionals: true,
    options: {
      agent: { type: "string", multiple: true },
      gitignore: { type: "boolean" },
      global: { type: "boolean", short: "g" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });

  if (values.version) {
    console.log(`${name} ${version}`);
    return;
  }

  const command = positionals[0];

  if (values.help) {
    showUsage(command);
    return;
  }

  if (!command || command === "install" || command === "i") {
    await handleInstall(values);
    return;
  }

  if (command === "add") {
    await handleAdd(positionals, values);
    return;
  }

  if (
    command === "uninstall" ||
    command === "remove" ||
    command === "rm" ||
    command === "un"
  ) {
    await handleUninstall(positionals, values);
    return;
  }

  throw new Error(`Unknown command: ${command}`);
}

function showUsage(command?: string): void {
  if (command === "add") {
    console.log(`
${c.bold}Usage:${c.reset} ${c.cyan}${name} add${c.reset} <source>... [options]

${c.bold}Arguments:${c.reset}
  ${c.cyan}<source>${c.reset}          Skill source ${c.dim}(e.g., vercel-labs/skills:pdf,commit)${c.reset}

${c.bold}Options:${c.reset}
  ${c.cyan}--agent${c.reset} <name>    Target agent ${c.dim}(default: claude-code, can be repeated)${c.reset}
  ${c.cyan}-g, --global${c.reset}      Install skills globally
  ${c.cyan}--gitignore, --gi${c.reset} Add skill directories to .gitignore
  ${c.cyan}-h, --help${c.reset}        Show this help message

${c.bold}Examples:${c.reset}
  ${c.dim}$${c.reset} ${name} add vercel-labs/skills
  ${c.dim}$${c.reset} ${name} add vercel-labs/skills:pdf,commit
  ${c.dim}$${c.reset} ${name} add vercel-labs/skills:find-skills anthropics/skills:skill-creator
  ${c.dim}$${c.reset} ${name} add https://skills.sh/vercel-labs/skills/pdf
  ${c.dim}$${c.reset} ${name} add https://github.com/owner/repo/tree/main/skills/skill-name
`);
    return;
  }

  if (
    command === "uninstall" ||
    command === "remove" ||
    command === "rm" ||
    command === "un"
  ) {
    console.log(`
${c.bold}Usage:${c.reset} ${c.cyan}${name} uninstall${c.reset} <source>... [options]

${c.bold}Arguments:${c.reset}
  ${c.cyan}<source>${c.reset}          Skill source ${c.dim}(e.g., vercel-labs/skills:pdf,commit)${c.reset}

${c.bold}Options:${c.reset}
  ${c.cyan}--agent${c.reset} <name>    Target agent ${c.dim}(default: claude-code, can be repeated)${c.reset}
  ${c.cyan}-g, --global${c.reset}      Remove skills globally
  ${c.cyan}-h, --help${c.reset}        Show this help message

${c.bold}Examples:${c.reset}
  ${c.dim}$${c.reset} ${name} uninstall vercel-labs/skills
  ${c.dim}$${c.reset} ${name} uninstall vercel-labs/skills:pdf,commit
  ${c.dim}$${c.reset} ${name} uninstall org/repo-a:skill1 org/repo-b
`);
    return;
  }

  if (command === "install" || command === "i") {
    console.log(`
${c.bold}Usage:${c.reset} ${c.cyan}${name} install${c.reset} [options]

${c.bold}Options:${c.reset}
  ${c.cyan}--agent${c.reset} <name>    Target agent ${c.dim}(default: claude-code, can be repeated)${c.reset}
  ${c.cyan}-g, --global${c.reset}      Install skills globally
  ${c.cyan}--gitignore, --gi${c.reset} Add skill directories to .gitignore
  ${c.cyan}-h, --help${c.reset}        Show this help message

${c.bold}Examples:${c.reset}
  ${c.dim}$${c.reset} npx ${name} install
  ${c.dim}$${c.reset} npx ${name} install --global
  ${c.dim}$${c.reset} npx ${name} install --agent claude-code --agent cursor
`);
    return;
  }

  console.log(`
${c.bold}${name}${c.reset} ${c.dim}v${version}${c.reset}

Manage project skills declaratively with ${c.cyan}skills.json${c.reset}

${c.bold}Usage:${c.reset} ${c.cyan}${name}${c.reset} <command> [options]

${c.bold}Commands:${c.reset}
  ${c.cyan}install, i${c.reset}        Install skills from skills.json ${c.dim}(default)${c.reset}
  ${c.cyan}add${c.reset}               Add a skill source to skills.json
  ${c.cyan}uninstall, rm${c.reset}     Remove a skill source from skills.json

${c.bold}Options:${c.reset}
  ${c.cyan}-h, --help${c.reset}        Show help for a command
  ${c.cyan}-v, --version${c.reset}     Show version number

${c.bold}Examples:${c.reset}
  ${c.dim}$${c.reset} ${name}                              ${c.dim}# Install all skills${c.reset}
  ${c.dim}$${c.reset} ${name} add vercel-labs/skills       ${c.dim}# Add a skill source${c.reset}
  ${c.dim}$${c.reset} ${name} add owner/repo:pdf,commit    ${c.dim}# Add specific skills${c.reset}
  ${c.dim}$${c.reset} ${name} add org/a:skill1 org/b:skill2 ${c.dim}# Add multiple sources${c.reset}
  ${c.dim}$${c.reset} ${name} add https://github.com/o/r/tree/main/skills/s ${c.dim}# GitHub URL${c.reset}
  ${c.dim}$${c.reset} ${name} uninstall vercel-labs/skills  ${c.dim}# Remove a skill source${c.reset}

Run ${c.cyan}${name} <command> --help${c.reset} for command-specific help.
`);
}

main().catch((error) => {
  console.error(
    `${c.red}error:${c.reset} ${error instanceof Error ? error.message : error}`
  );
  process.exitCode = 1;
});

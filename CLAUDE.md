# AGENTS.md

## Project Overview

**skill-forger** is a CLI wrapper to manage project [skills](https://github.com/vercel-labs/skills) and lock them in `skills.json`. It provides a declarative way to install skills per project, similar to how package managers work with `package.json`.

## Architecture

```
src/
├── cli.ts              # CLI entry point with parseArgs
├── config.ts           # skills.json config management
├── skills.ts           # Skills CLI execution
└── utils/
    ├── colors.ts       # ANSI color codes for terminal output
    └── gitignore.ts    # .gitignore file management
test/
├── cli.test.ts         # parseSource tests
├── config.test.ts      # Config and lock file tests
├── skills.test.ts      # Skills CLI tests
└── gitignore.test.ts   # Gitignore tests
```

### Config (src/config.ts)

- `findSkillsConfig(cwd?)` — Finds `skills.json` by traversing up from cwd
- `readSkillsConfig(options?)` — Reads and validates `skills.json` (options: `{ cwd?, createIfNotExists? }`)
- `updateSkillsConfig(updater, options?)` — Generic update with callback (options: `{ cwd?, createIfNotExists? }`, defaults `createIfNotExists: true`)
- `addSkill(source, skills?, options?)` — Adds a skill source (options: `{ cwd?, createIfNotExists? }`, defaults `createIfNotExists: true`)
- `removeSkill(source, skills?, options?)` — Removes a skill source or specific skills (options: `{ cwd? }`)
- `removeSkillsLockEntries(source, skills?, options?)` — Removes entries from `skills-lock.json` matching the source (options: `{ cwd? }`)
- Auto-injects `$schema` field during validation if missing

### Skills CLI (src/skills.ts)

- `findSkillsBinary(options?)` — Finds local `skills` binary in node_modules/.bin (options: `{ cache? }`, cached by default)
- `installSkills(options?)` — Spawns `skills add` for each source with progress logging; options: `{ cwd?, agents?, global?, yes? }`
- `installSkillSource(entry, options)` — Installs a single skill source; options: `{ cwd?, agents?, global?, yes?, prefix? }`
- `uninstallSkillSource(entry, options)` — Removes a single skill source from disk via `skills remove`; options: `{ cwd?, agents?, global?, yes?, prefix? }`
- `findSkillsDirs(cwd?)` — Scans cwd for directories containing a `skills` subdirectory (e.g., `.claude/skills`, `.agents/skills`)

### CLI Entry (src/cli.ts)

- `main(argv?)` — CLI entry point using Node.js `parseArgs`
- `parseSource(input)` — Parses source input into `{ source, skills }`; supports:
  - Colon/comma format: `owner/repo:skill1,skill2` or `owner/repo:skill1:skill2`
  - GitHub URLs: `https://github.com/owner/repo/tree/branch/skills/skill-name`
  - skills.sh URLs: `https://skills.sh/owner/repo/skill-name`

### Utils (src/utils/)

**colors.ts** — ANSI escape codes for terminal styling:

- `c.reset`, `c.bold`, `c.dim` — formatting
- `c.red`, `c.green`, `c.yellow`, `c.blue`, `c.magenta`, `c.cyan` — colors
- Auto-disabled when stdout is not a TTY

**gitignore.ts** — `.gitignore` file management:

- `findGitignore(cwd?)` — Finds `.gitignore` by traversing up from cwd
- `addGitignoreEntries(entries, options?)` — Adds entries to `.gitignore` (options: `{ cwd?, createIfNotExists? }`)
  - Idempotent: skips entries already present
  - Creates `.gitignore` if not found (unless `createIfNotExists: false`)

### `skills.json` Schema

```ts
interface SkillsConfig {
  $schema?: string; // auto-injected if missing
  skills: SkillSource[];
}

interface SkillSource {
  source: string; // e.g., "vercel-labs/skills"
  skills?: string[]; // specific skills to install (empty/omitted = all)
}
```

### `skills-lock.json` Schema

Managed by the underlying `skills` CLI. `skill-forger` cleans up entries on uninstall.

```ts
interface SkillsLock {
  version: number;
  skills: Record<string, {
    source: string;       // e.g., "vercel-labs/skills"
    sourceType: string;   // e.g., "github"
    computedHash: string;
  }>;
}
```

## CLI Commands

```sh
skill-forger                                    # Install skills (default)
skill-forger install, i [--global] [--gitignore] [--agent <name>...]  # Install skills from skills.json
skill-forger add <source>... [--gitignore] [--agent <name>...]  # Add skill source(s) to skills.json
skill-forger uninstall, rm <source>... [--global] [--agent <name>...]  # Remove skill source(s) from skills.json and skills-lock.json
```

### Source Format

Sources can include inline skills using colon or comma-separated syntax, GitHub URLs, or skills.sh URLs:

```sh
skill-forger add vercel-labs/skills              # Add all skills from source
skill-forger add owner/repo:pdf,commit           # Add specific skills inline
skill-forger add org/repo-a:skill1 org/repo-b:skill2  # Multiple sources
skill-forger add https://github.com/owner/repo/tree/main/skills/skill-name  # GitHub URL
skill-forger add https://skills.sh/owner/repo/pdf     # skills.sh URL (https)
skill-forger add skills.sh/owner/repo/pdf             # skills.sh URL (no protocol)
```

### Options

- `--agent <name>` — Target agent (default: `claude-code`, repeatable)
- `-g, --global` — Install skills globally (for `install` command)
- `--gitignore, --gi` — Add skill directories to `.gitignore` (ignored with `--global`)
- `-h, --help` — Show help
- `-v, --version` — Show version

## Development

```sh
bun install      # Install dependencies
bun run dev      # Run tests in watch mode
bun run build    # Build with obuild
bun run test     # Run test suite
bun run check    # Lint and format check
bun run fix      # Auto-fix lint/format
bun run typecheck # TypeScript type checking
```

## Code Style

- ESM only (`"type": "module"`)
- Use explicit `.ts` extensions in imports
- Uses `obuild` for building, `ultracite`/`biome` for linting/formatting
- TypeScript strict mode enabled
- Run `bun run fix` to auto-format/lint, `bun run check` to check issues

## Integration

Skill-forge delegates actual skill installation to Vercel's skills CLI. It first checks for a local `skills` binary in `node_modules/.bin`, falling back to `npx skills`:

```sh
# Uses local binary if available, otherwise:
npx skills add <source> --skill <name> --agent <agent-name> --yes
```

### Install Output

Installation shows colored progress with timing:

```
🛠️ Installing 2 skills...
◐ [1/2] Installing vercel-labs/skills (pdf, commit)
✔ Installed vercel-labs/skills (2s)

◐ [2/2] Installing anthropics/courses (all skills)
✔ Installed anthropics/courses (1s)
🔥 Done! 2 skills installed in 3s.
```

## Maintaining Documentation

When making changes to the project (new APIs, architectural changes, updated conventions):

- **`AGENTS.md`** — Update with technical details, architecture, and best practices for AI agents
- **`README.md`** — Update with user-facing documentation (usage, installation, examples) for end users

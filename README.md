# ⚒️ skill-forger

Manage project Agent [skills](https://skills.sh/) from `skills.json`. Uses [`skills`](https://github.com/vercel-labs/skills) CLI under the hood.

The `sf` shorthand is available after installing the package:

```bash
npm install -g skill-forger  # global install
sf add vercel-labs/skills

# or with a local install
npm install -D skill-forger
npx sf add vercel-labs/skills
```

## Usage

**Install all skills from `skills.json`:**

```bash
npx skill-forger
```

<p align="center">
  <img src="./assets/install.svg" alt="Install preview">
</p>

**Add new skills to project:**

```bash
npx skill-forger add skills.sh/vercel-labs/skills/find-skills

npx skill-forger add anthropics/skills:skill-creator

npx skill-forger add https://github.com/getsentry/sentry-for-ai/tree/main/skills/sentry-fix-issues
```

<p align="center">
  <img src="./assets/add.svg" alt="Install preview">
</p>

**Remove skills from project:**

```bash
npx skill-forger uninstall vercel-labs/skills:find-skills
```

This creates a `skills.json` file that you commit to your repo — so your whole team shares the same skills:

```sh
git add skills.json
```

```json
{
  "$schema": "https://unpkg.com/skill-forger/skills_schema.json",
  "skills": [
    { "source": "vercel-labs/skills", "skills": ["find-skills"] },
    { "source": "anthropics/skills", "skills": ["skill-creator"] }
  ]
}
```

## CLI Usage

```sh
npx skill-forger                          # Install skills from skills.json (default)
npx skill-forger install, i               # Same as above
npx skill-forger add <source>...          # Add skill source(s) to skills.json
npx skill-forger uninstall, rm <source>... # Remove skill source(s) from skills.json
```

### Commands

#### `install` (default)

Installs all skills defined in `skills.json`.

```sh
npx skill-forger install [options]
```

| Option             | Description                                       |
| ------------------ | ------------------------------------------------- |
| `--agent <name>`   | Target agent (default: `claude-code`, repeatable) |
| `-g, --global`     | Install skills globally                           |
| `--gitignore, --gi`| Add skill directories to `.gitignore`             |
| `-h, --help`       | Show help                                         |

#### `add`

Adds skill source(s) to `skills.json` and installs them.

```sh
npx skill-forger add <source>... [options]
```

| Option             | Description                                       |
| ------------------ | ------------------------------------------------- |
| `--agent <name>`   | Target agent (default: `claude-code`, repeatable) |
| `-g, --global`     | Install skills globally                           |
| `--gitignore, --gi`| Add skill directories to `.gitignore`             |
| `-h, --help`       | Show help                                         |

#### `uninstall`

Removes skill source(s) from `skills.json`, `skills-lock.json`, and deletes them from disk.

Aliases: `remove`, `rm`, `un`

```sh
npx skill-forger uninstall <source>... [options]
```

| Option             | Description                                       |
| ------------------ | ------------------------------------------------- |
| `--agent <name>`   | Target agent (default: `claude-code`, repeatable) |
| `-g, --global`     | Remove skills globally                            |
| `-h, --help`       | Show help                                         |

```sh
# Remove an entire source
npx skill-forger uninstall vercel-labs/skills

# Remove specific skills from a source
npx skill-forger uninstall vercel-labs/skills:pdf,commit

# Remove multiple sources at once
npx skill-forger uninstall org/repo-a:skill1 org/repo-b
```

### Source Formats

Sources can be specified in multiple formats:

```sh
# GitHub owner/repo format
npx skill-forger add vercel-labs/skills

# GitHub URL (extracts owner/repo and skill name automatically)
npx skill-forger add https://github.com/getsentry/sentry-for-ai/tree/main/skills/sentry-fix-issues

# skills.sh URL
npx skill-forger add https://skills.sh/vercel-labs/skills/find-skills
npx skill-forger add skills.sh/vercel-labs/skills/find-skills

# Multiple sources
npx skill-forger add org/repo-a:skill1 org/repo-b:skill2

# Specify skills (comma separated)
npx skill-forger add vercel-labs/agent-skills:vercel-deploy,vercel-react-native-skills
```

### Examples

```sh
# Install all skills from skills.json
npx skill-forger

# Add a skill source (all skills)
npx skill-forger add vercel-labs/skills

# Add specific skills from a source
npx skill-forger add vercel-labs/agent-skills:vercel-deploy,vercel-react-native-skills

# Add from skills.sh URL
npx skill-forger add https://skills.sh/vercel-labs/skills/find-skills

# Add from GitHub URL
npx skill-forger add https://github.com/getsentry/sentry-for-ai/tree/main/skills/sentry-fix-issues

# Install skills globally
npx skill-forger install --global

# Add skills and update .gitignore
npx skill-forger add vercel-labs/skills --gitignore

# Install for multiple agents
npx skill-forger install --agent claude-code --agent cursor

# Remove a skill source
npx skill-forger uninstall vercel-labs/skills

# Remove specific skills
npx skill-forger uninstall vercel-labs/skills:pdf,commit
```

### Supported Agents

skill-forger passes the `--agent` flag to the underlying [skills CLI](https://github.com/vercel-labs/skills). Supported agents include:

- `claude-code` (default)
- `cursor`
- `codex`
- `github-copilot`

```sh
# Install for a specific agent
npx skill-forger install --agent cursor

# Install for multiple agents
npx skill-forger install --agent claude-code --agent cursor
```

<details>

<summary>local development</summary>

- Clone this repository
- Install [Bun](https://bun.sh)
- Install dependencies using `bun install`
- Run interactive tests using `bun run dev`

</details>

## License

Published under the [MIT](https://github.com/marcm8793/skill-forger/blob/main/LICENSE) license 🔥.

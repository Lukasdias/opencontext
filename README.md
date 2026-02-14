# opencode-context

Smart file finder for codebases with relevance scoring. Includes an OpenCode plugin.

## Installation

### OpenCode Plugin

Add to `~/.config/opencode/opencode.json`:

```json
{
  "plugin": ["opencode-context@latest"]
}
```

Or run:

```bash
bunx opencode-context@latest install
```

OpenCode will auto-install the plugin from npm on next startup.

### CLI

```bash
npm install -g opencode-context
# or
bun install -g opencode-context
```

## OpenCode Plugin Usage

The plugin registers the `find_files` tool.

**Tool: `find_files`**

| Argument | Type | Default | Description |
|----------|------|---------|-------------|
| `query` | string | required | Search query |
| `maxFiles` | number | 5 | Maximum results |
| `minScore` | number | 15 | Minimum relevance score (0-100) |
| `includeTests` | boolean | false | Include test files |
| `includeConfigs` | boolean | false | Include config files |
| `includeDocs` | boolean | false | Include documentation |

**Example:**

```
find_files query="auth middleware" maxFiles=5
```

**Scoring algorithm considers:**
- Filename matches (exact, partial)
- Filepath directory names
- Content (function names, class names, imports, exports)
- File type (tests, configs, docs)

## CLI Usage

```bash
opencontext --query "auth" --max-files 5
opencontext --interactive
opencontext -q "database" --json
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `-q, --query` | Search query | required |
| `-n, --max-files` | Maximum results | 5 |
| `--min-score` | Minimum relevance | 15 |
| `-p, --path` | Root path | cwd |
| `--include-tests` | Include test files | false |
| `--include-configs` | Include config files | false |
| `--include-docs` | Include docs | false |
| `--no-content` | Skip content search | false |
| `-j, --json` | JSON output | false |
| `-d, --detailed` | Show match reasons | false |
| `-i, --interactive` | Interactive mode | false |

## How It Works

1. Scans directory with fast-glob
2. Extracts metadata (size, language, exports, imports)
3. Scores each file against query
4. Returns ranked results

No index persistence - scans fresh on each query.

## License

MIT

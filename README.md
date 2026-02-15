# opencode-context

Semantic code search with ranked file matches and contextual line snippets showing exactly where matches occur. Available as CLI and OpenCode plugin.

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

The plugin registers the `find_files` tool for semantic file search within OpenCode.

### Quick Reference for AI Agents

**Tool:** `find_files`  
**Purpose:** Find relevant files before reading them  
**When to use:** User asks to find, locate, search, or "where is X"

### Arguments

| Argument | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `query` | string | **YES** | - | What to find (e.g., "auth", "database models") |
| `maxFiles` | number | no | 5 | Number of results |
| `minScore` | number | no | 15 | Relevance threshold (0-100) |
| `includeTests` | boolean | no | false | Include *.test.*, *.spec.* |
| `includeConfigs` | boolean | no | false | Include *.config.*, .rc files |
| `includeDocs` | boolean | no | false | Include *.md, docs/ |
| `includeLinePreviews` | boolean | no | false | Show matching line snippets |
| `maxSnippetsPerFile` | number | no | 3 | Max line snippets per file |

### Examples

```
find_files query="authentication middleware"
find_files query="database" maxFiles=10 includeTests=true
find_files query="config" includeConfigs=true
find_files query="search" includeLinePreviews=true maxSnippetsPerFile=5
```

**Scoring:** Filename (highest) > Path > Content > Imports/Exports  
**Tip:** If no results, try `minScore=5` for broader search

## CLI Usage

```bash
opencode-context --query "auth" --max-files 5
opencode-context --interactive
opencode-context -q "database" --json
opencode-context -q "search" --line-previews --detailed
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
| `--line-previews` | Show matching line snippets | false |
| `--max-snippets` | Max snippets per file | 3 |
| `-j, --json` | JSON output | false |
| `-d, --detailed` | Show match reasons | false |
| `-i, --interactive` | Interactive mode | false |

## How It Works

1. Scans directory with fast-glob
2. Extracts metadata (size, language, exports, imports, **line index**)
3. Scores each file against query
4. Returns ranked results with optional line-level previews

No index persistence - scans fresh on each query. Line previews show the exact context where matches occur, with surrounding lines for full context.

## Uninstallation

Remove from `~/.config/opencode/opencode.json` plugins array:

```json
{
  "plugin": []
}
```

## License

MIT

# OpenContext

Smart file finder for codebases - semantic search with confidence scoring.

## Quick Install (Copy & Paste)

For **humans** - paste this to your LLM agent (Claude Code, Cursor, etc):

```
Install opencontext plugin by following the instructions here:
https://raw.githubusercontent.com/lukashdias/opencontext/refs/heads/main/README.md
```

For **LLM agents** - fetch and follow the installation guide:

```bash
curl -s https://raw.githubusercontent.com/lukashdias/opencontext/refs/heads/main/README.md
```

---

## Installation

### For Humans

```bash
# Add to your opencode.json plugins array
bunx opencontext install
```

Or manually add to `~/.config/opencode/opencode.json`:

```json
{
  "plugins": ["opencontext"]
}
```

### For LLM Agents

If you're an LLM Agent helping set up OpenContext, follow these steps:

**Step 1: Check if OpenCode is installed**

```bash
opencode --version
```

**Step 2: Add plugin to config**

Read the user's `~/.config/opencode/opencode.json` and add `"opencontext"` to the plugins array. Create the file if it doesn't exist:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["opencontext"]
}
```

**Step 3: Verify**

```bash
opencode --version
```

### Say 'Done!' to the user

---

## Usage

The agent can use the `find_files` tool to locate relevant files:

```
find_files query="auth middleware" maxFiles=5
find_files query="user model" minScore=30
find_files query="database config" includeConfigs=true
```

**Tool arguments:**
- `query` (required) - Search query (e.g., "auth middleware", "user model")
- `maxFiles` - Maximum results (default: 5)
- `minScore` - Minimum relevance 0-100 (default: 15)
- `includeTests` - Include test files (default: false)
- `includeConfigs` - Include config files (default: false)
- `includeDocs` - Include documentation (default: false)

---

## Why OpenContext?

**Reduces token usage** - Instead of agent reading 50 files to find "UserService", it queries `find_files` → gets 5 most relevant paths → reads only those.

**Always fresh** - Indexes on every query, no stale data.

**Smart scoring** - Considers filename, filepath, content, exports, imports, and semantic hints.

---

## As CLI

```bash
npm install -g opencontext
# or
bun install -g opencontext
```

### Examples

```bash
# Search for auth middleware files
opencontext --query "auth middleware" --max-files 5

# Interactive mode
opencontext --interactive

# JSON output
opencontext -q "database config" --json
```

---

## License

MIT

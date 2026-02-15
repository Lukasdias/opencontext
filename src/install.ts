#!/usr/bin/env bun

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const CONFIG_PATH = join(process.env.HOME || homedir(), '.config/opencode/opencode.json');
const AGENTS_PATH = join(process.env.HOME || homedir(), '.config/opencode/AGENTS.md');

interface OpenCodeConfig {
  $schema?: string;
  plugin?: string[];
  instructions?: string[];
  [key: string]: unknown;
}

async function ensureConfigDir() {
  const dir = dirname(CONFIG_PATH);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function readConfig(): Promise<OpenCodeConfig> {
  try {
    const content = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { $schema: "https://opencode.ai/config.json", plugin: [] };
  }
}

async function writeConfig(config: OpenCodeConfig): Promise<void> {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

async function readAgentsMd(): Promise<string> {
  try {
    return await fs.readFile(AGENTS_PATH, 'utf-8');
  } catch {
    return '';
  }
}

async function writeAgentsMd(content: string): Promise<void> {
  await fs.writeFile(AGENTS_PATH, content);
}

const TOOL_DOCUMENTATION = `
## find_files Tool (opencode-context plugin)

**Purpose:** Semantic file search for locating relevant code files before reading them.

**When to use:**
- User asks to find, locate, or search for files
- Before reading multiple files to understand a codebase
- Looking for specific functionality (auth, database, config, etc.)
- User mentions "where is X defined" or "find Y"

**Arguments:**

| Name | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| query | string | YES | - | Search query describing what to find (e.g., "auth middleware", "user model") |
| maxFiles | number | NO | 5 | Maximum number of files to return |
| minScore | number | NO | 15 | Minimum relevance score (0-100). Lower = more results |
| includeTests | boolean | NO | false | Include test files (*.test.*, *.spec.*, etc.) |
| includeConfigs | boolean | NO | false | Include configuration files (*.config.*, .rc files) |
| includeDocs | boolean | NO | false | Include documentation (*.md, README, docs/) |

**Usage examples:**

\`\`\`
# Basic search
find_files query="authentication"

# More results with tests
find_files query="database" maxFiles=10 includeTests=true

# Find config files
find_files query="webpack" includeConfigs=true

# Low threshold for broader search
find_files query="utils" minScore=5
\`\`\`

**Scoring algorithm:**
- Filename matches (highest weight)
- Directory path matches
- Content matches (function names, class names)
- Import/export statements
- File type (tests ranked lower unless requested)

**Best practices:**
1. Call this BEFORE reading files when user asks to find something
2. Use maxFiles=10+ when doing initial codebase exploration
3. Set includeTests=true only when user specifically asks about tests
4. If no results, try lowering minScore to 5 or using broader terms
5. Results include relevance scores - files above 50 are highly relevant
`;

async function updateAgentsMd() {
  const existingContent = await readAgentsMd();
  const toolMarker = '## find_files Tool (opencode-context plugin)';
  
  if (existingContent.includes(toolMarker)) {
    // Tool already documented - update it
    const beforeTool = existingContent.split(toolMarker)[0];
    const afterTool = existingContent.split(toolMarker)[1];
    // Find next ## heading or end of file
    const nextHeading = afterTool.search(/\n## /);
    const rest = nextHeading >= 0 ? afterTool.slice(nextHeading) : '';
    
    const newContent = beforeTool + TOOL_DOCUMENTATION + '\n' + rest;
    await writeAgentsMd(newContent);
    console.log('✓ Updated AGENTS.md with find_files documentation');
  } else {
    // Add to existing or create new
    const header = existingContent.includes('# Available Tools') 
      ? existingContent 
      : (existingContent.trim() ? existingContent + '\n\n# Available Tools\n' : '# Available Tools\n');
    
    const newContent = header + '\n' + TOOL_DOCUMENTATION;
    await writeAgentsMd(newContent);
    console.log('✓ Created/updated AGENTS.md with find_files documentation');
  }
}

async function updateOpencodeConfig() {
  const config = await readConfig();
  
  // Ensure plugin array exists
  if (!config.plugin) {
    config.plugin = [];
  }
  
  const pluginName = 'opencode-context@latest';
  
  if (!config.plugin.includes(pluginName)) {
    config.plugin.push(pluginName);
    console.log('✓ Added opencode-context@latest to plugins');
  } else {
    console.log('✓ opencode-context already in plugins');
  }
  
  // Ensure AGENTS.md is in instructions
  if (!config.instructions) {
    config.instructions = [];
  }
  
  const agentsRef = '~/.config/opencode/AGENTS.md';
  if (!config.instructions.includes(agentsRef)) {
    config.instructions.push(agentsRef);
    console.log('✓ Added AGENTS.md to instructions');
  } else {
    console.log('✓ AGENTS.md already in instructions');
  }
  
  await writeConfig(config);
}

async function install() {
  console.log('Installing opencode-context plugin...\n');
  
  await ensureConfigDir();
  
  // Update both config and AGENTS.md
  await updateOpencodeConfig();
  await updateAgentsMd();
  
  console.log('\n✓ Installation complete!');
  console.log('\nTo use:');
  console.log('  1. Restart opencode if running');
  console.log('  2. The AI agent will now see find_files in available tools');
  console.log('  3. Try: "Find files related to authentication"\n');
}

// Check if this file is being run directly (not imported)
const isMainModule = process.argv[1]?.includes('install.js') || process.argv[1]?.includes('install.ts');
if (isMainModule) {
  install().catch(console.error);
}

export { updateAgentsMd, updateOpencodeConfig };

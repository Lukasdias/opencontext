#!/usr/bin/env bun

import { promises as fs } from 'fs';
import { join, dirname } from 'path';

const CONFIG_PATH = join(process.env.HOME || '', '.config/opencode/opencode.json');

interface OpenCodeConfig {
  $schema?: string;
  plugin?: string[];
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

async function install() {
  console.log('Installing opencode-context plugin...\n');
  
  await ensureConfigDir();
  
  const config = await readConfig();
  
  if (!config.plugin) {
    config.plugin = [];
  }
  
  const pluginName = 'opencode-context@latest';
  
  if (config.plugin.includes(pluginName)) {
    console.log('✓ opencode-context already in plugins');
  } else {
    config.plugin.push(pluginName);
    console.log('✓ Added opencode-context@latest to plugins');
  }
  
  await writeConfig(config);
  
  console.log('\n✓ Installation complete!');
  console.log('\nTo use:');
  console.log('  1. Run opencode in your project');
  console.log('  2. Ask: "Find files related to auth"');
  console.log('  3. The agent will use find_files tool\n');
}

if (import.meta.main) {
  install().catch(console.error);
}

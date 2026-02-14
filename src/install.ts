#!/usr/bin/env bun

import { promises as fs } from 'fs';
import { join, dirname } from 'path';

const CONFIG_PATH = join(process.env.HOME || '', '.config/opencode/opencode.json');

async function ensureConfigDir() {
  const dir = dirname(CONFIG_PATH);
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function readConfig() {
  try {
    const content = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch {
    return { $schema: "https://opencode.ai/config.json", plugin: [] };
  }
}

async function writeConfig(config) {
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

async function install() {
  console.log('Installing OpenContext plugin...\n');
  
  await ensureConfigDir();
  
  const config = await readConfig();
  
  if (!config.plugin) {
    config.plugin = [];
  }
  
  const pluginName = 'opencontext';
  
  if (config.plugin.includes(pluginName)) {
    console.log('✓ OpenContext already in plugins');
  } else {
    config.plugin.push(pluginName);
    console.log('✓ Added opencontext to plugins');
  }
  
  await writeConfig(config);
  
  console.log('\n✓ Installation complete!');
  console.log('\nTo use:');
  console.log('  1. Run opencode in your project');
  console.log('  2. Ask: "Find files related to auth"');
  console.log('  3. The agent will use find_files tool\n');
}

install().catch(console.error);

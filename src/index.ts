import { Command } from 'commander';
import * as p from '@clack/prompts';
import color from 'picocolors';
import { searchFiles, parseQuery } from './search.js';
import { SearchOptions } from './types.js';

const program = new Command();

function formatScore(score: number): string {
  if (score >= 80) return color.green(score.toString().padStart(3));
  if (score >= 50) return color.yellow(score.toString().padStart(3));
  return color.gray(score.toString().padStart(3));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatResults(result: Awaited<ReturnType<typeof searchFiles>>, detailed: boolean = false) {
  console.log('');

  if (result.files.length === 0) {
    console.log(color.yellow('No matching files found.'));
    console.log(color.gray(`Scanned ${result.filesScanned} files in ${result.timeMs}ms`));
    return;
  }

  console.log(color.cyan(`Found ${result.files.length} relevant files (scanned ${result.filesScanned} in ${result.timeMs}ms):\n`));

  for (const file of result.files) {
    const scoreStr = formatScore(file.score);
    const sizeStr = color.gray(formatFileSize(file.metadata.size).padStart(8));
    const langStr = file.metadata.language
      ? color.cyan(`[${file.metadata.language}]`)
      : '';
    const typeStr = file.metadata.isTest
      ? color.yellow('[test]')
      : file.metadata.isConfig
      ? color.magenta('[config]')
      : '';

    console.log(`${scoreStr} ${sizeStr}  ${file.relativePath} ${langStr} ${typeStr}`);

    if (detailed && file.reasons.length > 0) {
      for (const reason of file.reasons) {
        const icon = reason.type === 'filename' ? '📝' :
                     reason.type === 'filepath' ? '📁' :
                     reason.type === 'content' ? '📄' :
                     reason.type === 'function' ? '⚡' :
                     reason.type === 'class' ? '🏗️' :
                     reason.type === 'export' ? '↗️' :
                     reason.type === 'test' ? '🧪' :
                     reason.type === 'config' ? '⚙️' :
                     '•';
        console.log(`        ${icon} ${color.gray(reason.description)}`);
      }
      console.log('');
    }
  }
}

async function interactiveMode() {
  p.intro(`${color.bgCyan(color.black(' opencontext '))}`);

  const query = await p.text({
    message: 'What are you looking for?',
    placeholder: 'e.g., auth middleware, user model, database config',
    validate: (value) => {
      if (!value || value.trim().length === 0) return 'Please enter a search query';
    },
  });

  if (p.isCancel(query)) {
    p.outro(color.yellow('Cancelled'));
    process.exit(0);
  }

  const maxFiles = await p.select({
    message: 'How many results?',
    options: [
      { value: 5, label: 'Top 5', hint: 'Most focused' },
      { value: 10, label: 'Top 10', hint: 'Balanced' },
      { value: 20, label: 'Top 20', hint: 'Comprehensive' },
    ],
    initialValue: 5,
  });

  if (p.isCancel(maxFiles)) {
    p.outro(color.yellow('Cancelled'));
    process.exit(0);
  }

  const includeType = await p.select({
    message: 'What to include?',
    options: [
      { value: 'code', label: 'Code files only', hint: 'No tests or configs' },
      { value: 'all', label: 'Everything', hint: 'Tests, configs, and docs' },
      { value: 'tests', label: 'Focus on tests', hint: 'Prioritize test files' },
      { value: 'configs', label: 'Focus on configs', hint: 'Prioritize configuration' },
    ],
    initialValue: 'code',
  });

  if (p.isCancel(includeType)) {
    p.outro(color.yellow('Cancelled'));
    process.exit(0);
  }

  const detailed = await p.confirm({
    message: 'Show detailed match reasons?',
    initialValue: false,
  });

  if (p.isCancel(detailed)) {
    p.outro(color.yellow('Cancelled'));
    process.exit(0);
  }

  const s = p.spinner();
  s.start('Searching...');

  try {
    const options: SearchOptions = {
      query: query as string,
      maxFiles: maxFiles as number,
      includeTests: includeType === 'all' || includeType === 'tests',
      includeConfigs: includeType === 'all' || includeType === 'configs',
      includeDocs: includeType === 'all',
      searchContent: true,
    };

    const result = await searchFiles(options);
    s.stop(`Search complete`);

    formatResults(result, detailed as boolean);
    p.outro(color.green(`Found ${result.files.length} files`));
  } catch (error) {
    s.stop('Search failed');
    const message = error instanceof Error ? error.message : String(error);
    p.outro(color.red(`Error: ${message}`));
    process.exit(1);
  }
}

program
  .name('opencontext')
  .description('Smart file finder for codebases - semantic search with confidence scoring')
  .version('1.0.0');

program
  .option('-q, --query <query>', 'Search query')
  .option('-n, --max-files <number>', 'Maximum number of results', '5')
  .option('--min-score <score>', 'Minimum relevance score (0-100)', '15')
  .option('-p, --path <path>', 'Root path to search from', process.cwd())
  .option('--include-tests', 'Include test files', false)
  .option('--include-configs', 'Include configuration files', false)
  .option('--include-docs', 'Include documentation files', false)
  .option('--no-content', 'Skip content search (faster)')
  .option('--max-size <bytes>', 'Maximum file size to read', '1048576')
  .option('-j, --json', 'Output as JSON', false)
  .option('-d, --detailed', 'Show detailed match reasons', false)
  .option('-i, --interactive', 'Interactive mode', false)
  .action(async (options) => {
    try {
      if (options.interactive || !options.query) {
        await interactiveMode();
        return;
      }

      const searchOptions: SearchOptions = {
        query: options.query,
        maxFiles: parseInt(options.maxFiles, 10),
        minScore: parseInt(options.minScore, 10),
        rootPath: options.path,
        includeTests: options.includeTests,
        includeConfigs: options.includeConfigs,
        includeDocs: options.includeDocs,
        searchContent: options.content !== false,
        maxFileSize: parseInt(options.maxSize, 10),
      };

      const result = await searchFiles(searchOptions);

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        formatResults(result, options.detailed);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(color.red(`Error: ${message}`));
      process.exit(1);
    }
  });

if (import.meta.main) {
  program.parse();
}

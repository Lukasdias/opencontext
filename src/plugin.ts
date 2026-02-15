import { type Plugin, tool } from "@opencode-ai/plugin";
import { searchFiles } from "./search.js";
import type { SearchOptions } from "./types.js";

interface SearchToolArgs {
  query: string;
  maxFiles?: number;
  minScore?: number;
  includeTests?: boolean;
  includeConfigs?: boolean;
  includeDocs?: boolean;
}

const OpenContextPlugin: Plugin = async () => {
  return {
    tool: {
      find_files: tool({
        description: "Find relevant files in the codebase based on a semantic search query. Use this to locate files related to a task before reading them. Returns ranked results with relevance scores.",
        args: {
          query: tool.schema.string().describe("Search query (e.g., 'auth middleware', 'user model', 'database config')"),
          maxFiles: tool.schema.number().optional().describe("Maximum number of results (default: 5)"),
          minScore: tool.schema.number().optional().describe("Minimum relevance score 0-100 (default: 15)"),
          includeTests: tool.schema.boolean().optional().describe("Include test files (default: false)"),
          includeConfigs: tool.schema.boolean().optional().describe("Include config files (default: false)"),
          includeDocs: tool.schema.boolean().optional().describe("Include documentation (default: false)"),
        },
        async execute(args: SearchToolArgs, context) {
          const { directory } = context;

          if (!args.query || typeof args.query !== 'string') {
            return "Error: query parameter is required. Usage: find_files query='search term'";
          }

          const options: SearchOptions = {
            query: args.query,
            maxFiles: args.maxFiles || 5,
            minScore: args.minScore || 15,
            rootPath: directory,
            includeTests: args.includeTests || false,
            includeConfigs: args.includeConfigs || false,
            includeDocs: args.includeDocs || false,
            searchContent: true,
          };

          const result = await searchFiles(options);

          if (result.files.length === 0) {
            return `No files found matching "${args.query}". Scanned ${result.filesScanned} files in ${result.timeMs}ms.`;
          }

          const lines = result.files.map(f =>
            `${f.relativePath} (score: ${f.score})`
          );

          return `Found ${result.files.length} relevant files:\n${lines.join('\n')}\n\nScanned ${result.filesScanned} files in ${result.timeMs}ms.`;
        },
      }),
    },
  };
};

export default OpenContextPlugin;
